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

Alpine.start();
