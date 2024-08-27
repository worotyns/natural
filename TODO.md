Async run via "handlers" in Deno.kv (durable run);
Expires for data? or archive method? sth need to be implemented;

//: () => number & {async: () => Promise<void>}
function run() {
  function sample() {
    return Math.random();
  }
  
  sample.async = () => {
    return 'queued';
  }

  return sample;
}

const inst = run()
console.log(inst(null, {async: true})) // opts
console.log(inst.async())

