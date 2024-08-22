# Natural Framework

Wrapper around deno KV to build elastic entities.

Idea:

- atom - primitive (can be persisted, restored)
- molecule - namespace (aggregator for atoms, can create new atoms)
- cell - long living durable process can use molecules and atoms inside

You can store simple atom, or molecule. Mutate them, use it in cells.

This is just concept phase of project - WIP
