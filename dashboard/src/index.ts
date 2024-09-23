import "./styles.css";
import Alpine from "alpinejs";
// import PineconeRouter from 'pinecone-router';
window.Alpine = Alpine;

// Alpine.plugin(PineconeRouter);
Alpine.store("main", {
  searchQuery: '',
  selectedTab: 'Liked',
  commands: [
      { name: 'Command Name 1', description: 'Description of command 1.', parameters: ['Date', 'Boolean', 'String', 'Number'], expanded: false },
      { name: 'Command Name 2', description: 'Description of command 2.', parameters: ['Parameter A', 'Parameter B'], expanded: false },
      { name: 'Command Name 3', description: 'Description of command 3.', parameters: ['Parameter X', 'Parameter Y'], expanded: false }
  ],
  items: Array.from({ length: 30 }, (_, i) => ({
      date: new Date().toLocaleDateString(),
      title: `Title ${i + 1}`,
      description: `Description for item ${i + 1}`,
      liked: false
  }))
})

import {db} from './idb.ts';

async function main() {
  await db.clear();

  await db.set("key1", { name: "Item 1" });

  const item = await db.get("key1");

  await db.append([{ timestamp: Date.now(), data: "Activity 1" }]);
  await db.append([{ timestamp: Date.now() - 1000 * 60 * 60 * 20 , data: "Activity 2" }]);

  // const aggregated = await db.aggregate(item => item.data.length);
  const scanned = await db.scan(Date.now() - 1000 * 60 * 60, 10);

  console.log({item, scanned});
}

Alpine.start();


main();
