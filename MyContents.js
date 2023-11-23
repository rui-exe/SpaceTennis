import * as THREE from 'three';
import { MyAxis } from './MyAxis.js';
import { MyFileReader } from './parser/MyFileReader.js';
import { SceneBuilder } from './parser/SceneBuilder.js';
/**
 *  This class contains the contents of out application
 */
class MyContents  {

    /**
       constructs the object
       @param {MyApp} app The application object
    */ 
    constructor(app) {
        this.app = app
        this.axis = null
        this.sceneDir = "scenes/SGI_TP2_XML_T04_G11_v01/"
        this.sceneFile = "SGI_TP2_XML_T04_G11_v01.xml"

        this.reader = new MyFileReader(app, this, this.onSceneLoaded);
		this.reader.open(this.sceneDir + this.sceneFile);
        this.lights = []
        this.materials = []
    }

    /**
     * initializes the contents
     */
    init() {
        // create once 
        if (this.axis === null) {
            // create and attach the axis to the scene
            this.axis = new MyAxis(this)
            this.app.scene.add(this.axis)
        }
    }

    /**
     * Called when the scene xml file load is complete
     * @param {MySceneData} data the entire scene data object
     */
    onSceneLoaded(data) {
        console.info("scene data loaded " + data + ". visit MySceneData javascript class to check contents for each data item.")
        this.onAfterSceneLoadedAndBeforeRender(data);
        this.app.setContents(this)
        this.app.endSceneLoader();
    }

    output(obj, indent = 0) {
        console.log("" + new Array(indent * 4).join(' ') + " - " + obj.type + " " + (obj.id !== undefined ? "'" + obj.id + "'" : ""))
    }

    onAfterSceneLoadedAndBeforeRender(data) {

        const sceneBuilder = new SceneBuilder(this.app, data, this.sceneDir)
        this.lights = sceneBuilder.lights
        this.materials = sceneBuilder.materials

        return;
       
    }

    update() {
        
    }
}

export { MyContents };