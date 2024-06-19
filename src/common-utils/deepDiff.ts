import _ from 'lodash'

type DiffResult = Record<string, { from?: any; to?: any }>

export const deepDiff = (fromObject: Record<string, any>, toObject: Record<string, any>): DiffResult => {
  const buildCurrentChangePath = (path: string | undefined, key: string) => (_.isUndefined(path) ? key : `${path}.${key}`)

  const changes: DiffResult = {}

  const walk = (fromObj: Record<string, any>, toObj: Record<string, any>, path: string | undefined = undefined): void => {
    for (const key of _.keys(fromObj)) {
      const currentPath = buildCurrentChangePath(path, key)
      if (!_.has(toObj, key)) {
        changes[currentPath] = { from: _.get(fromObj, key) }
      }
    }

    for (const [key, toValue] of _.entries(toObj)) {
      const currentPath = buildCurrentChangePath(path, key)
      if (!_.has(fromObj, key)) {
        changes[currentPath] = { to: toValue }
      } else {
        const fromValue = _.get(fromObj, key)
        if (_.isEqual(fromValue, toValue)) continue
        if (_.isObjectLike(toValue) && _.isObjectLike(fromValue)) {
          walk(fromValue, toValue, currentPath)
        } else {
          changes[currentPath] = { from: fromValue, to: toValue }
        }
      }
    }
  }

  walk(fromObject, toObject)
  return changes
}
