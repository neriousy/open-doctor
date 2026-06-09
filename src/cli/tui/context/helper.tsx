import { createContext, useContext, type ReactNode } from "react"

export function createRequiredContext<T>(name: string) {
  const context = createContext<T | null>(null)

  function Provider(props: { value: T; children: ReactNode }) {
    return <context.Provider value={props.value}>{props.children}</context.Provider>
  }

  function useValue() {
    const value = useContext(context)
    if (!value) throw new Error(`${name} context must be used within ${name}Provider`)
    return value
  }

  return { Provider, useValue }
}
