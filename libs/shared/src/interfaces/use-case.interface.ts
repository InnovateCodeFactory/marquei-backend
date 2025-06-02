export interface UseCase<Args extends any[] = any[], Return = any> {
  execute(...args: Args): Promise<Return>;
}
