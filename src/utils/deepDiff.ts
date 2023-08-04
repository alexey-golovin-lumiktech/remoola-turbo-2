import _ from 'lodash'

export const deepDiff = (fromObject, toObject) => {
  const buildCurrentChangePath = (path, key) => (_.isUndefined(path) ? key : `${path}.${key}`)

  const changes = {}
  const walk = (fromObject, toObject, path = undefined) => {
    for (const key of _.keys(fromObject)) {
      const currentPath = buildCurrentChangePath(path, key)
      if (!_.has(toObject, key)) changes[currentPath] = { from: _.get(fromObject, key) }
    }

    for (const [key, to] of _.entries(toObject)) {
      const currentPath = buildCurrentChangePath(path, key)
      if (!_.has(fromObject, key)) changes[currentPath] = { to }
      else {
        const from = _.get(fromObject, key)
        if (_.isEqual(from, to)) continue
        if (_.isObjectLike(to) && _.isObjectLike(from)) walk(from, to, currentPath)
        else changes[currentPath] = { from, to }
      }
    }
  }

  walk(fromObject, toObject)
  return changes
}
