import type { Engine } from 'claude-code/testing'
import type { On, RenderPropsOf, SessionRateLimit } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const MIN = 60_000
const HOUR = 60 * MIN
const T0 = Date.parse('2027-01-15T06:00:00Z')
const SURFACES = ['terminal', 'desktop'] as const

const WINDOWS: SessionRateLimit[] = [
  { kind: 'five_hour', percentUsed: 14, resetsAt: new Date(T0 + 2 * HOUR + 55 * MIN).toISOString() },
  { kind: 'seven_day', percentUsed: 76, resetsAt: new Date(T0 + 4 * 24 * HOUR).toISOString() },
]

const BAND: RenderPropsOf['AbovePrompt'] = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 12 },
  view: {},
}

type World = {
  readonly stored?: Readonly<Record<string, unknown>>
  /** The band beneath draws the engine's own drawing, as a session's does, instead of a line. */
  readonly isEngineBand?: boolean
  /** The account's usage the endpoint answers for a first-party login; absent, the session has none. */
  readonly accountUsage?: string
}

/** What reached the endpoint: its URL and the auth handle it carried. */
type Fetched = { readonly url: string; readonly auth: string | undefined }

/**
 * The engine beneath the plugin: a clock, a store, usage with no windows yet,
 * a login (or none) and the account's usage, and a band that draws a line.
 */
const world = (on: On, { stored = {}, isEngineBand = false, accountUsage }: World = {}) => {
  const clock = mock.clock(on, { now: T0 })
  const fetched: Fetched[] = []
  mock.store(on, stored)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: T0, context: { window: 200_000 }, rateLimits: [] } }))
  on('session.authorize', () => ({
    value: accountUsage === undefined ? null : { handle: 'handle-1', kind: 'bearer' as const },
  }))
  on('http.fetch', (_$, e) => {
    fetched.push({ url: e.url, auth: e.init?.auth })
    return { value: { status: 200, ok: true, headers: {}, text: accountUsage ?? '' } }
  })
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) =>
    isEngineBand ? { type: 'engine' as const, ref: 0 } : $.ui.resolve(e).Text({ children: 'beneath' }),
  )
  return { clock, fetched }
}

const start = async ($: Engine) => {
  await $.session.start({ cwd: '/workspace', surface: 'terminal', isInteractive: true })
  await $.session.measure({ context: { window: 200_000 }, rateLimits: WINDOWS, changed: ['rateLimits'] })
}

describe('the meter above the prompt', () => {
  test('shows each window’s percent and countdown once a reply reports them', async ($, on) => {
    world(on)
    await start($)
    for (const surface of SURFACES) {
      const band = await $.ui.mount({ plugin: 'usage-meter', surface, component: 'AbovePrompt', props: BAND })
      for (const text of ['5H', '14%', '2h 55m', '│', 'WK', '76%', '4d 0h', 'beneath']) {
        expect(await band.find({ text })).toBeDefined()
      }
      expect((await band.find({ type: 'Text', text: '76%' }))?.props).toMatchObject({ bold: true, color: 'red' })
      expect((await band.find({ type: 'Text', text: '14%' }))?.props).not.toHaveProperty('color')
    }
  })

  test('shows the Fable week the account’s usage reports, asked with the session’s own login', async ($, on) => {
    const accountUsage = JSON.stringify({
      limits: [
        { kind: 'weekly_all', percent: 76, resets_at: WINDOWS[1]?.resetsAt, scope: null },
        {
          kind: 'weekly_scoped',
          percent: 30,
          resets_at: WINDOWS[1]?.resetsAt,
          scope: { model: { id: null, display_name: 'Fable' }, surface: null },
        },
      ],
    })
    const { fetched } = world(on, { accountUsage })
    await start($)
    expect(fetched).toEqual([{ url: 'https://api.anthropic.com/api/oauth/usage', auth: 'handle-1' }])
    for (const surface of SURFACES) {
      const band = await $.ui.mount({ plugin: 'usage-meter', surface, component: 'AbovePrompt', props: BAND })
      const texts = (await band.findAll({ type: 'Text' })).map(found => found.text)
      expect(texts).toEqual(['beneath', '5H', '14%', '2h 55m', '│', 'WK', '76%', '4d 0h', '│', 'Fable', '30%', '4d 0h'])
    }
  })

  test('asks nothing of a session with no first-party login', async ($, on) => {
    const { fetched } = world(on)
    await start($)
    expect(fetched).toEqual([])
  })

  test('keeps the engine’s own drawing in a tree the surface accepts', async ($, on) => {
    world(on, { isEngineBand: true })
    await start($)
    for (const surface of SURFACES) {
      const band = await $.ui.mount({ plugin: 'usage-meter', surface, component: 'AbovePrompt', props: BAND })
      expect(await band.find({ text: '76%' })).toBeDefined()
    }
  })

  test('leaves the band to the plugins beneath while no window is reported', async ($, on) => {
    world(on)
    await $.session.start({ cwd: '/workspace', surface: 'terminal', isInteractive: true })
    const band = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', component: 'AbovePrompt', props: BAND })
    expect(await band.find({ text: '%' })).toBeUndefined()
    expect(await band.find({ text: 'beneath' })).toBeDefined()
  })

  test('yields to a survey and to a band too narrow or too short for it', async ($, on) => {
    world(on)
    await start($)
    for (const props of [{ ...BAND, hasSurvey: true }, { ...BAND, bodyColumns: 29 }, { ...BAND, maxRows: 0 }]) {
      const band = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', component: 'AbovePrompt', props })
      expect(await band.find({ text: '14%' })).toBeUndefined()
    }
  })

  test('counts down as the minutes pass', async ($, on) => {
    const { clock } = world(on)
    await start($)
    const band = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', component: 'AbovePrompt', props: BAND })
    await clock.advance(10 * MIN)
    expect(await band.find({ text: '2h 45m' })).toBeDefined()
  })
})

describe('/usage-meter', () => {
  test('opens the pane and closes it on the second run', async ($, on) => {
    world(on)
    const open = new Set<string>()
    on('ui.panes', () => ({
      value: [...open].map(id => ({ id, title: 'Usage', isShown: true, isFocused: false, isPlaced: true })),
    }))
    on('ui.open', (_$, e) => (open.add(e.id), { value: { isPlaced: true as const } }))
    on('ui.close', (_$, e) => (open.delete(e.id), { value: undefined }))
    await start($)
    const run = () =>
      $.command.run({
        command: 'usage-meter',
        args: '',
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 100 },
      })
    expect((await run()).text).toBe('Usage pane open. Run /usage-meter again to close it.')
    expect([...open]).toEqual(['usage-meter'])
    expect((await run()).text).toBe('Usage pane closed.')
    expect([...open]).toEqual([])
  })
})

describe('the pane', () => {
  test('draws a bar and the reset, pace and outlook of each window', async ($, on) => {
    world(on)
    await start($)
    const pane = await $.ui.mount({
      plugin: 'usage-meter',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'usage-meter',
      props: { title: 'Usage', isFocused: false, bodyColumns: 40, placement: 'inline', scroll: { offset: 0, bodyRows: 14 }, view: {} },
    })
    expect(await pane.find({ text: '5-hour limit · 14% used' })).toBeDefined()
    expect(await pane.find({ text: 'Weekly limit · 76% used' })).toBeDefined()
    expect(await pane.find({ text: /^at this pace: known in 15m$/ })).toBeDefined()
    const bars = await pane.findAll({ key: 'used' })
    expect(bars.map(bar => bar.props)).toMatchObject([
      { width: '14%', backgroundColor: 'green' },
      { width: '76%', backgroundColor: 'red' },
    ])
  })
})

describe('the stored tracks', () => {
  test('carry a window’s pace into the next session', async ($, on) => {
    const stored = {
      tracks: {
        version: 1,
        tracks: { five_hour: { points: [{ atMs: T0 - HOUR, percent: 4 }] } },
      },
    }
    world(on, { stored })
    await start($)
    const pane = await $.ui.mount({
      plugin: 'usage-meter',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'usage-meter',
      props: { title: 'Usage', isFocused: false, bodyColumns: 40, placement: 'inline', scroll: { offset: 0, bodyRows: 14 }, view: {} },
    })
    expect(await pane.find({ text: 'pace 10.0%/h over the last 1h 0m' })).toBeDefined()
  })
})
