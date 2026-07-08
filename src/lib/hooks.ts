import { useCallback, useEffect, useRef, useState } from 'react'

/** Carga un recurso de la API con estado de error y recarga manual. */
export function useResource<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(() => {
    fetcherRef
      .current()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(reload, [reload])

  return { data, error, reload }
}

/**
 * Autoguardado con debounce contra la API + flush al desmontar
 * (si navegás con un cambio pendiente, se guarda igual).
 */
export function useAutosave<T>(value: T | null | undefined, save: (value: T) => Promise<unknown>, delay = 600) {
  const valueRef = useRef(value)
  const savedRef = useRef(value)
  const saveRef = useRef(save)
  valueRef.current = value
  saveRef.current = save

  useEffect(() => {
    if (value === null || value === undefined || value === savedRef.current) return
    const timer = setTimeout(() => {
      savedRef.current = value
      saveRef.current(value).catch((e) => console.error('Error al guardar:', e))
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  useEffect(
    () => () => {
      const pending = valueRef.current
      if (pending !== null && pending !== undefined && pending !== savedRef.current) {
        savedRef.current = pending
        saveRef.current(pending).catch((e) => console.error('Error al guardar:', e))
      }
    },
    [],
  )
}
