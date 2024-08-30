// deno-lint-ignore ban-types no-explicit-any
export function createMonitoredObject(
  target: any,
  callback: Function,
  path: string = "",
) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      const fullPath = path ? `${path}.${prop.toString()}` : prop;

      // Apply Proxy to nested objects or arrays
      if (typeof value === "object" && value !== null) {
        return createMonitoredObject(value, callback, fullPath.toString());
      }

      return value;
    },

    set(target, prop, value, receiver) {
      const oldValue = target[prop];
      const success = Reflect.set(target, prop, value, receiver);
      const fullPath = path ? `${path}.${prop.toString()}` : prop;

      if (success && oldValue !== value) {
        callback("set", fullPath, value, oldValue);
      }

      return success;
    },

    deleteProperty(target, prop) {
      const oldValue = target[prop];
      const success = Reflect.deleteProperty(target, prop);
      const fullPath = path ? `${path}.${prop.toString()}` : prop;

      if (success) {
        callback("delete", fullPath, undefined, oldValue);
      }

      return success;
    },
  });
}
