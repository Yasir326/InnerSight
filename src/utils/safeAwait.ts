export async function safeAwait<T>(promise: Promise<T>): Promise<[undefined, T] | [Error, undefined]> {
  return promise
    .then((data: T) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error: Error) => {
      return [error, undefined] as [Error, undefined];
    });
}
