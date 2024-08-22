import { sprintf } from "@std/fmt/printf";

export const createLog = (...msg: string[]) => {
  return sprintf("[%s]: %s", new Date().toISOString(), msg.join(" "));
};

export const measure = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

export {
  sprintf
}