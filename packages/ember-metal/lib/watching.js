/**
@module ember-metal
*/

import {
  removeChainWatcher
} from './chains';
import {
  watchKey,
  unwatchKey
} from './watch_key';
import {
  watchPath,
  unwatchPath
} from './watch_path';
import {
  isPath
} from './path_cache';
import {
  peekMeta,
  deleteMeta
} from './meta';

/**
  Starts watching a property on an object. Whenever the property changes,
  invokes `Ember.propertyWillChange` and `Ember.propertyDidChange`. This is the
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  `Ember.addObserver()`

  @private
  @method watch
  @for Ember
  @param obj
  @param {String} _keyPath
*/
function watch(obj, _keyPath, m) {
  if (!isPath(_keyPath)) {
    watchKey(obj, _keyPath, m);
  } else {
    watchPath(obj, _keyPath, m);
  }
}

export { watch };

export function isWatching(obj, key) {
  let meta = peekMeta(obj);
  return (meta && meta.peekWatching(key)) > 0;
}

export function watcherCount(obj, key) {
  let meta = peekMeta(obj);
  return (meta && meta.peekWatching(key)) || 0;
}

export function unwatch(obj, _keyPath, m) {
  if (!isPath(_keyPath)) {
    unwatchKey(obj, _keyPath, m);
  } else {
    unwatchPath(obj, _keyPath, m);
  }
}

const NODE_STACK = [];

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method destroy
  @for Ember
  @param {Object} obj  the object to destroy
  @return {void}
  @private
*/
export function destroy(obj) {
  let meta = peekMeta(obj);
  let node, nodes, key, nodeObject;

  if (meta) {
    deleteMeta(obj);
    // remove chainWatchers to remove circular references that would prevent GC
    node = meta.readableChains();
    if (node) {
      NODE_STACK.push(node);
      // process tree
      while (NODE_STACK.length > 0) {
        node = NODE_STACK.pop();
        // push children
        nodes = node._chains;
        if (nodes) {
          for (key in nodes) {
            if (nodes[key] !== undefined) {
              NODE_STACK.push(nodes[key]);
            }
          }
        }
        // remove chainWatcher in node object
        if (node._watching) {
          nodeObject = node._object;
          if (nodeObject) {
            removeChainWatcher(nodeObject, node._key, node);
          }
        }
      }
    }
  }
}
