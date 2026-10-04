// Runs tasks concurrently, at most `limit` at a time, and hands each result
// over in the tasks' order as soon as it and every earlier one have settled:
// output stays deterministic while the slow work overlaps.

export const runOrdered = async <T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
  onSettled: (result: T, index: number) => void,
): Promise<T[]> => {
  const results = new Array<T>(tasks.length)
  const settled = new Array<boolean>(tasks.length).fill(false)
  let nextToStart = 0
  let nextToReport = 0

  const report = () => {
    while (nextToReport < tasks.length && settled[nextToReport]) {
      onSettled(results[nextToReport] as T, nextToReport)
      nextToReport += 1
    }
  }

  const worker = async () => {
    while (nextToStart < tasks.length) {
      const index = nextToStart
      nextToStart += 1
      const task = tasks[index]
      if (task === undefined) continue
      results[index] = await task()
      settled[index] = true
      report()
    }
  }

  const workers = Math.max(1, Math.min(limit, tasks.length))
  await Promise.all(Array.from({ length: workers }, worker))
  return results
}
