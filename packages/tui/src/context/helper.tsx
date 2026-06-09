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

export function createStateContext<T, Props extends object = object>(input: {
  name: string
  init: (props: Props) => T
}) {
  const context = createContext<T | null>(null)

  function Provider(props: Props & { children: ReactNode }) {
    const value = input.init(props)
    return <context.Provider value={value}>{props.children}</context.Provider>
  }

  function useValue() {
    const value = useContext(context)
    if (!value) throw new Error(`${input.name} context must be used within ${input.name}Provider`)
    return value
  }

  return { Provider, useValue }
}
