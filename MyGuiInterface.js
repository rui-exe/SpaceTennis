import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MyApp } from './MyApp.js';
import { MyContents } from './MyContents.js';

/**
    This class customizes the gui interface for the app
*/
class MyGuiInterface  {

    /**
     *
     * @param {MyApp} app The application object
     */
    constructor(app) {
        this.app = app
        this.datgui =  new GUI();
        this.contents = null
    }

    createCameraFolder(cameras){

        // create folder
        const cameraFolder = this.datgui.addFolder('Camera')

        cameraFolder.add(this.app, 'activeCameraName', Object.keys(cameras) ).name("Active Camera");

        cameraFolder.open()
    }

    changeWireframe(materials){

        for (let material_id in materials) {
            let material = materials[material_id]
            material.wireframe = (this.app.wireframe === true)? true : material.wireframeDefault
        }
    }


    createControls(){
        this.datgui.add(this.app, 'wireframe').name("Show Wireframe").onChange(this.changeWireframe.bind(this, this.contents.materials));
    }

    createLightsFolder(lights){
        const lightsFolder = this.datgui.addFolder('Lights')

        for (let light of lights) {
            lightsFolder.add(light, 'visible').name(light.name + " ("+light.type+")")
            if (light.helper !== undefined){    
                lightsFolder.add(light.helper, 'visible').name(light.name + " Helper")
                lightsFolder.add(light, 'castShadow').name(light.name + " Active Shadow")
                
            }
        }

        lightsFolder.open()

    }

    /**
     * Set the contents object
     * @param {MyContents} contents the contents objects
     */
    setContents(contents) {
        this.contents = contents
    }

    /**
     * Initialize the gui interface
     */
    init() {
        this.createCameraFolder(this.app.cameras)
        this.createControls()
        this.createLightsFolder(this.contents.lights)
    }
}

export { MyGuiInterface };