import { MyApp } from './MyApp.js';
import { MyContents } from './MyContents.js';

// create the application object
let app = new MyApp()
// initializes the application
app.init()

// create the contents object
let contents = new MyContents(app)
// initializes the contents
contents.init()

