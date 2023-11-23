import * as THREE from 'three';
import { MySceneData } from './MySceneData.js';
import { NURBSSurface } from 'three/addons/curves/NURBSSurface.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

export class SceneBuilder{

    /**
       constructs the object
       @param {THREE.Scene} scene The application scene
       @param {MySceneData} scenedata 
    */ 

    constructor(app, scenedata, path) {
        this.app = app
        this.scene = this.app.scene;
        this.scenedata = scenedata
        this.sceneDir = path

        this.textures = []
        this.materials = []
        this.lights = []

        
        this.buildGlobals()
        this.buildCamaras()
        this.buildSkybox()
        this.buildTexture()
        this.buildMaterials()
        this.buildObjects()
    }

    /**
     * Builds the skybox
    */

    buildSkybox() {
        const skyboxData = this.scenedata.getSkybox();
    
        const textureLoader = new THREE.TextureLoader();
        
        const textures = [
            textureLoader.load(this.sceneDir + skyboxData.right),
            textureLoader.load(this.sceneDir + skyboxData.left),
            textureLoader.load(this.sceneDir + skyboxData.up),
            textureLoader.load(this.sceneDir + skyboxData.down),
            textureLoader.load(this.sceneDir + skyboxData.front),
            textureLoader.load(this.sceneDir + skyboxData.back)
        ];
    
        const materials = textures.map(texture => new THREE.MeshBasicMaterial({ map: texture , side: THREE.BackSide}));
        
        const skyboxGeometry = new THREE.BoxGeometry(
            skyboxData.size[0],
            skyboxData.size[1],
            skyboxData.size[2]
        );
    
        const skyboxMesh = new THREE.Mesh(skyboxGeometry, materials);
        skyboxMesh.position.set(skyboxData.center[0], skyboxData.center[1], skyboxData.center[2]);
        skyboxMesh.userData.id = skyboxData.id;

    
        this.scene.add(skyboxMesh);
    }

    /**
     * Loads a mipmap image from the specified path and sets it in the parent texture in the specified level
     * @param {THREE.Texture} parentTexture The parent texture
     * @param {number} level The mipmap level
     * @param {string} path The path to the image
     * @returns {void}
     */

    loadMipmap(parentTexture, level, path)
    {
        // load texture. On loaded call the function to create the mipmap for the specified level 
        new THREE.TextureLoader().load(path, 
            function(mipmapTexture)  // onLoad callback
            {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                ctx.scale(1, 1);

                // const fontSize = 48
                const img = mipmapTexture.image
                canvas.width = img.width;
                canvas.height = img.height

                // first draw the image
                ctx.drawImage(img, 0, 0 )

                // set the mipmap image in the parent texture in the appropriate level
                parentTexture.mipmaps[level] = canvas
            },
            undefined, // onProgress callback currently not supported
            function(err) {
                console.error('Unable to load the image ' + path + ' as mipmap level ' + level + ".", err)
            }
        )
    }

    /**
     * Clones a texture
     * @param {THREE.Texture} texture The texture to clone
     * @returns {THREE.Texture} The cloned texture
     */

    cloneTexture(texture){
        const textureInfo = this.scenedata.textures[texture.texture_i]
        let newTexture = null
        if(textureInfo.isVideo){
            newTexture = this.buildVideo(textureInfo)
        }else if(textureInfo.mipmap0 != null){
            newTexture = this.buildMipMap(textureInfo)
        }else{
            newTexture = texture.clone()
        }
        newTexture.texture_i = texture.texture_i
        newTexture.repeat.set(texture.repeat.x, texture.repeat.y)
        newTexture.wrapS = THREE.RepeatWrapping;
        newTexture.wrapT = THREE.RepeatWrapping;
        newTexture.encoding = THREE.sRGBEncoding;

        return newTexture
    }

    /**
     * Clones a material
     * @param {THREE.Material} material The material to clone
     * @returns {THREE.Material} The cloned material
     */

    cloneMaterial(material){
        const newMaterial = material.clone()
        newMaterial.wireframeDefault = material.wireframeDefault
        return newMaterial
    }

    /**
     * Builds a video texture
     * @param {Object} textureInfo The texture info
     * @returns {THREE.VideoTexture} The video texture
     */

    buildVideo(textureInfo){
        const video = document.createElement( 'video' );
        video.src = this.sceneDir + textureInfo.filepath
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.load(); // must call after setting/changing source
        
        let videoTexture = new THREE.VideoTexture( video );
        video.addEventListener( 'loadeddata', () => {
            let videoTexture = new THREE.VideoTexture( video );
            videoTexture.encoding = THREE.sRGBEncoding;
            videoTexture.name = textureInfo.id
            videoTexture.minFilter = textureInfo.minFilter
            videoTexture.magFilter = textureInfo.magFilter
            videoTexture.anisotropy = textureInfo.anisotropy
            videoTexture.wrapS = THREE.RepeatWrapping;
            videoTexture.wrapT = THREE.RepeatWrapping;
            const animate = () => {
                if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
                    videoTexture.needsUpdate = true;
                }
                requestAnimationFrame( animate );
            }
            animate();
        } );
        video.play();
        return videoTexture
    }

    /**
     * Builds a mipmap texture
     * @param {Object} textureInfo The texture info
     * @returns {THREE.Texture} The mipmap texture
     */

    buildMipMap(textureInfo){
        let texture = new THREE.TextureLoader().load(this.sceneDir + textureInfo.filepath);
                
        texture.minFilter = THREE[textureInfo.minFilter]
        texture.magFilter = THREE[textureInfo.magFilter]
        for (let i = 0; i <= 7; i++) {
            let mipmapkey = "mipmap" + i ;
            this.loadMipmap(texture, i, this.sceneDir + textureInfo[mipmapkey])
        }

        return texture
    }

    /**
     * Builds the textures
     * @returns {void}
     */

    buildTexture(){
        this.textures = []

        for (let i in this.scenedata.textures){
            const textureInfo = this.scenedata.textures[i]
            if(textureInfo.isVideo){
                const videoTexture = this.buildVideo(textureInfo)
                this.textures[textureInfo.id] = videoTexture
                this.textures[textureInfo.id].texture_i = i
                continue
            }else if(textureInfo.mipmap0 != null){
                // use mipmaps
                const texture = this.buildMipMap(textureInfo)
                
                this.textures[textureInfo.id] = texture
                this.textures[textureInfo.id].texture_i = i
            }else{
                const texture =  new THREE.TextureLoader().load( this.sceneDir + textureInfo.filepath );
                texture.name = textureInfo.id
                texture.magFilter = textureInfo.magFilter
                texture.minFilter = textureInfo.minFilter
                texture.anisotropy = textureInfo.anisotropy 
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.encoding = THREE.sRGBEncoding;
                this.textures[textureInfo.id] = texture
                this.textures[textureInfo.id].texture_i = i
            }
        }
    
    }

    /**
     * Builds the materials
     * @returns {void}
     */

    buildMaterials(){
        this.materials = []
        for (let i in this.scenedata.materials){
            const materialInfo = this.scenedata.materials[i]

            const material = new THREE.MeshPhongMaterial({
                color: materialInfo.color,
                specular: materialInfo.specular,
                emissive: materialInfo.emissive,
                shininess: materialInfo.shininess
                });

            if(materialInfo.textureref != null){
                if (this.textures[materialInfo.textureref] instanceof THREE.VideoTexture) {
                    // For VideoTexture, directly assign it to the material without cloning
                    material.map = this.cloneTexture(this.textures[materialInfo.textureref])
                    material.map.repeat.set(materialInfo.texlength_s, materialInfo.texlength_t)
                } 
                else {
                    material.map = this.cloneTexture(this.textures[materialInfo.textureref])
                    material.map.repeat.set(materialInfo.texlength_s, materialInfo.texlength_t)
                }

            }

            material.wireframe = materialInfo.wireframe
            material.wireframeDefault = materialInfo.wireframe
            
           
            if(materialInfo.twosided){
                material.side = THREE.DoubleSide
            }
            if(materialInfo.bumpref != null){
                material.bumpMap = this.cloneTexture(this.textures[materialInfo.bumpref])
            }
            if(materialInfo.bumpscale != null){
                material.bumpScale = materialInfo.bumpscale
            }
            if(materialInfo.specularrref != null){
                material.specularMap = this.cloneTexture(this.textures[materialInfo.specularrref])
                material.specularMap.repeat.set(materialInfo.texlength_s, materialInfo.texlength_t)
            }

            material.flatShading = materialInfo.shading == 'flat'

            this.materials[materialInfo.id] = material
        }

    }

    /**
     * Builds the ambient light and the fog if it exists
     * @returns {void}
     */

    buildGlobals(){


        const ambient = this.scenedata.getOptions()['ambient'];
        const background = this.scenedata.getOptions()['background'];
        
        const ambientLight = new THREE.AmbientLight( ambient);
        this.scene.add( ambientLight );

        this.scene.background = background

        // add fog
        const fog = this.scenedata.getFog();

        if (fog != null)    
           this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far)

    }

    /**
     * Builds the cameras
     * @returns {void}
     */
    buildCamaras(){

        
        const aspect = window.innerWidth / window.innerHeight;  
        for (var key in this.scenedata.cameras) {
            let camera_info = this.scenedata.cameras[key]

            switch (camera_info.type){
                case "orthogonal":
                    // create a orthographic camera
                    const left = camera_info.left / 2 * aspect
                    const right = camera_info.right /2 * aspect 
                    const top = camera_info.top / 2 
                    const bottom = camera_info.bottom / 2
                    const near = camera_info.near /2
                    const far =  camera_info.far                
                    const orthogonal = new THREE.OrthographicCamera( left, right, 
                        top, bottom, near, far);
                    orthogonal.position.set(camera_info.location[0], camera_info.location[1], camera_info.location[2]) 
                    orthogonal.lookAt( new THREE.Vector3(camera_info.target) );
                    this.app.addCamera(camera_info.id, orthogonal, camera_info)
                    
                    break

                case "perspective":
                    // Create a perspective camera
                    const perspective = new THREE.PerspectiveCamera( camera_info.angle, aspect, camera_info.near, camera_info.far)
                    perspective.position.set(camera_info.location[0], camera_info.location[1], camera_info.location[2]) 
                    perspective.lookAt( new THREE.Vector3(camera_info.target) );
                    this.app.addCamera(camera_info.id, perspective, camera_info)
                    break
            }
            console.log("Camera: ", this.app)

        }

        this.app.setActiveCamera(this.scenedata.activeCameraId)
    }

    /**
     * Builds the objects
     * @returns {void}
     */

    buildObjects(){
        const rootId = this.scenedata.rootId;
        const sceneObjects = new THREE.Group()
        this.buildObject(sceneObjects, this.scenedata.nodes[rootId])

        this.scene.add(sceneObjects)
        
    }

    /**
     * Builds an object
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildObject(object, objectData){

        switch(objectData.type){
            case "node":
                this.buildNode(object, objectData);
                break
            case "lod":
                this.buildLod(object, objectData);
                break
            case "primitive":
                this.buildPrimitive(object, objectData);
                break
            case "pointlight":
                this.buildPointlight(object, objectData);
                break
            case "spotlight":
                this.buildSpotlight(object, objectData);
                break
            case "directionallight":
                this.buildDirectionallight(object, objectData);
                break
            default:
                console.log("Not recognize: ", objectData.type)
        }
    }

    /**
     * Inherit shadows from the parent object
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @param {THREE.Object3D} node The node
     * @returns {void}
     */

    inheritShadows(object, objectData ,node){
        if(object.castShadow === true)
            node.castShadow = object.castShadow
        else
            node.castShadow = objectData.castShadows
        
        if(object.receiveShadow === true)
            node.receiveShadow = object.receiveShadow
        else
            node.receiveShadow = objectData.receiveShadows
    }

    /**
     * Builds a node
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {THREE.Object3D} The node
     */

    buildNode(object, objectData){
        let node = new THREE.Group()
        node.name = objectData.id
        // Transformations
        
        let translate = [0,0,0]
        let rotation = [0,0,0]
        let scale = [1,1,1]


        for(let transformation of objectData.transformations){
            let vec = null;
            switch(transformation.type){
                case 'T':
                    vec = transformation.translate
                    translate = [translate[0] + vec[0], translate[1] + vec[1], translate[2] + vec[2] ]
                    break
                case 'R':
                    vec = transformation.rotation
                    rotation = [rotation[0] + vec[0], rotation[1] + vec[1], rotation[2] + vec[2] ]
                    break
                case 'S':
                    vec = transformation.scale
                    scale = [scale[0]*vec[0], scale[1]*vec[1],scale[2]*vec[2]]
                    break
            }
        }

        node.position.set(translate[0],translate[1],translate[2])
        node.rotation.set(rotation[0],rotation[1],rotation[2])
        node.scale.set(scale[0],scale[1],scale[2])
        
        // materials
        if(objectData.materialIds.length == 0)
            node.material = object.material
        else
            node.material = this.materials[objectData.materialIds[0]]
        
        // shadows
        this.inheritShadows(object, objectData, node)

        // create children
        for (let child in objectData.children){
            this.buildObject(node, objectData.children[child])
        }


        object.add(node)
        node.parent = object
        return node
    }

    /**
     * Builds a lod
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildLod(object, objectData){
            const lod = new THREE.LOD();
            for (let childId in objectData.children) {
                const { node: newNode, mindist: minDist } = objectData.children[childId];
                let newObj = this.buildNode(object, newNode);
                lod.addLevel( newObj,minDist);
            }
            object.add(lod);
            lod.parent = object
            return lod
    }

    /**
     * Builds a primitive
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {THREE.Object3D} The primitive
     */

    buildPrimitive(object, objectData){

        let primitive = null
        switch(objectData.subtype){
            case "rectangle":
                primitive = this.buildRectangle(object, objectData)
                break
            case "cylinder":
                primitive = this.buildCylinder(object, objectData)
                break
            case "box":
                primitive = this.buildBox(object, objectData)
                break
            case "nurbs":
                primitive = this.buildNurbs(object, objectData)
                break
            case "sphere":
                primitive = this.buildSphere(object, objectData)
                break
            case "polygon":
                primitive = this.buildPolygon(object, objectData)
                break
            case "triangle":
                primitive = this.buildTriangle(object, objectData)
                break
            default:
                console.log("Not recognize: ", objectData)

        }
        // shadows
        if (primitive !== null){

            if (primitive instanceof Array){
                for (let i in primitive){
                    this.inheritShadows(object, objectData, primitive[i])
                }
            }else
                this.inheritShadows(object, objectData, primitive)
        }

        return primitive
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildRectangle(object, objectData){
        const xy2 = objectData.representations[0].xy2
        const xy1 = objectData.representations[0].xy1
        let width = Math.abs(xy2[0] - xy1[0])
        let height = Math.abs(xy2[1] - xy1[1])
        let parts_x = objectData.representations[0].parts_x
        let parts_y = objectData.representations[0].parts_y

        let material = object.material

        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
            material.side = THREE.FrontSide
            material.shadowSide = THREE.FrontSide
        }else{
            material = this.cloneMaterial(material)
            if (material.map != null){
                material.map = this.cloneTexture(material.map)
                material.map.repeat.set(width/material.map.repeat.x, height/material.map.repeat.y)
            }
        }   
        const rectangles = []

        // if double sided, create two objects and materials
        if (material.side === THREE.DoubleSide){
            const materialFront = this.cloneMaterial(material)
            materialFront.side = THREE.FrontSide
            this.materials.push(materialFront)

            const materialBack = this.cloneMaterial(material)
            materialBack.side = THREE.BackSide
            this.materials.push(materialBack)

            let newRectangleFront = new THREE.Mesh(new THREE.PlaneGeometry(width, height, parts_x, parts_y), materialFront)
            rectangles.push(newRectangleFront)

            let newRectangleBack = new THREE.Mesh(new THREE.PlaneGeometry(width, height, parts_x, parts_y), materialBack)
            rectangles.push(newRectangleBack)
            newRectangleBack.translateZ(-0.2)
        }else{
            this.materials.push(material)
            let rectangle = new THREE.Mesh(new THREE.PlaneGeometry(width, height, parts_x, parts_y), material)
            rectangles.push(rectangle)
        }

        for (let rectangle of rectangles){
            rectangle.position.set((xy1[0] + xy2[0]) / 2, (xy1[1] + xy2[1]) / 2, rectangle.position[2])

            rectangle.parent = object
            object.add(rectangle)
        }
        return rectangles
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildCylinder(object, objectData){
        let top = objectData.representations[0].top
        let bottom = objectData.representations[0].base
        let height = objectData.representations[0].height
        let slices = objectData.representations[0].slices
        let stacks = objectData.representations[0].stacks
        let capsClosed = objectData.representations[0].capsclose
        let thetaStart = objectData.representations[0].thetaStart
        let thetaLength = objectData.representations[0].thetaLength

        let material = object.material
        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
        }else if (material.side === THREE.DoubleSide){
            material = this.cloneMaterial(material)
            material.shadowSide = THREE.FrontSide
            this.materials.push(material)
        }
        let cylinder = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height,
             slices, stacks, capsClosed, thetaStart, thetaLength), material)
        object.add(cylinder)
        cylinder.parent = object

        return cylinder
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildBox(object, objectData){
        const xyz2 = objectData.representations[0].xyz2
        const xyz1 = objectData.representations[0].xyz1

        let width = Math.abs(xyz2[0] - xyz1[0])
        let height = Math.abs(xyz2[1] - xyz1[1])
        let depth = Math.abs(xyz2[2] - xyz1[2])
        let parts_x = objectData.representations[0].parts_x
        let parts_y = objectData.representations[0].parts_y
        let parts_z = objectData.representations[0].parts_z
        
        let material = object.material
        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
            this.materials.push(material)
        }else if (material.side === THREE.DoubleSide){
            material = this.cloneMaterial(material)
            this.materials.push(material)
        }

        let box = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, parts_x, parts_y, parts_z), material)
        box.translateX((xyz1[0] + xyz2[0]) / 2)
        box.translateY((xyz1[1] + xyz2[1]) / 2)
        box.translateZ((xyz1[2] + xyz2[2]) / 2)

        object.add(box)
        box.parent = object

        return box
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildNurbs(object, objectData){
        let nurbs = objectData.representations[0]
        const degree1 = nurbs.degree_u
        const degree2 = nurbs.degree_v
        const samples1 = nurbs.parts_u
        const samples2 = nurbs.parts_v
        const controlPoints = nurbs.controlpoints
        const knots1 = []
        const knots2 = []

        for (var i = 0; i <= degree1; i++) {
            knots1.push(0)
        }

        for (var i = 0; i <= degree1; i++) {
            knots1.push(1)
        }

        for (var i = 0; i <= degree2; i++) {
            knots2.push(0)
        }

        for (var i = 0; i <= degree2; i++) {
            knots2.push(1)
        }

        let stackedPoints = []

        const nrLines = degree1 +1 
        const nrColumns = degree2 + 1         

        for (let row = 0; row < nrLines; row++) {
            let newRow = []

            for(let col = 0; col < nrColumns; col++){  
                let controlPoint = controlPoints[row*nrColumns + col]
                newRow.push(new THREE.Vector4(controlPoint.xx,
                controlPoint.yy, controlPoint.zz, 1));
        
            }
            stackedPoints[row] = newRow;
        }

        const nurbsSurface = new NURBSSurface( degree1, degree2, knots1, knots2, stackedPoints );

        const geometry = new ParametricGeometry( getSurfacePoint, samples1, samples2 );
        
        let material = object.material
        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
            material.side = THREE.FrontSide
            material.shadowSide = THREE.FrontSide
            this.materials.push(material)
        }else if (material.side === THREE.DoubleSide){
            const materialFront = this.cloneMaterial(material)
            materialFront.side = THREE.FrontSide
            this.materials.push(materialFront)

            const materialBack = this.cloneMaterial(material)
            materialBack.side = THREE.BackSide
            this.materials.push(materialBack)

            let newNurbMeshFront = new THREE.Mesh(geometry, materialFront)
            newNurbMeshFront.scale.set(0.980, 0.980, 0.980)
            object.add(newNurbMeshFront)
            newNurbMeshFront.parent = object

            let newNurbMeshBack = new THREE.Mesh(geometry, materialBack)
            newNurbMeshBack.scale.set(1.015,1.015,1.015)

            object.add(newNurbMeshBack)
            newNurbMeshBack.parent = object
            
            return [newNurbMeshFront, newNurbMeshBack]
        }

        let newNurbMesh = new THREE.Mesh(geometry, material)
        object.add(newNurbMesh)
        newNurbMesh.parent = object
        
        return newNurbMesh

        function getSurfacePoint( u, v, target ) {
            return nurbsSurface.getPoint( u, v, target );
        }
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildSphere(object, objectData){
        let radius = objectData.representations[0].radius
        let widthSegments = objectData.representations[0].widthSegments
        let heightSegments = objectData.representations[0].heightSegments
        let phiStart = objectData.representations[0].phiStart
        let phiLength = objectData.representations[0].phiLength
        let thetaStart = objectData.representations[0].thetaStart
        let thetaLength = objectData.representations[0].thetaLength
        
        let material = object.material
        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
            material.side = THREE.FrontSide
            material.shadowSide = THREE.FrontSide
            this.materials.push(material)
        }else if (material.side === THREE.DoubleSide){
            material = this.cloneMaterial(material)
            material.shadowSide = THREE.BackSide
            this.materials.push(material)
        }
        let sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength), material)
        object.add(sphere)
        sphere.parent = object

        return sphere
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group   
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildPolygon(object, objectData) {
        const interpolate = (startValue, endValue, percentage) =>
            startValue + percentage * (endValue - startValue);
    
        const interpolateColor = (startColor, endColor, percentage) => [
            interpolate(startColor.r, endColor.r, percentage),
            interpolate(startColor.g, endColor.g, percentage),
            interpolate(startColor.b, endColor.b, percentage),
        ];
    
        const radius = objectData.representations[0].radius;
        const slices = objectData.representations[0].slices;
        const stacks = objectData.representations[0].stacks;
        const color_c = objectData.representations[0].color_c;
        const color_p = objectData.representations[0].color_p;
    
        const stackRadius = radius / stacks;
        const geometry = new THREE.BufferGeometry();
        const positions = [0, 0, 0];
        const normals = [0, 0, 1];
        const colors = [color_c.r, color_c.g, color_c.b];
        const indices = [];
        const uvCenterU = 0.5;
        const uvCenterV = 0.5;
        const uvRadius = 0.5;
        const uvs = [uvCenterU, uvCenterV];
    
        let stackPercentage = 1 / stacks;
        let stackColor = interpolateColor(color_c, color_p, stackPercentage);
    
        for (let currentSlice = 0; currentSlice < slices; currentSlice++) {
            const angle = (currentSlice / slices) * (2 * Math.PI);
            const x = stackRadius * Math.cos(angle);
            const y = stackRadius * Math.sin(angle);
            positions.push(x, y, 0);
            normals.push(0, 0, 1);
            const currentSliceIdx = 1 + currentSlice % slices;
            const nextSliceIdx = 1 + (currentSlice + 1) % slices;
            indices.push(0, currentSliceIdx, nextSliceIdx);
            colors.push(...stackColor);
            uvs.push(
                uvCenterU + uvRadius * stackPercentage * Math.cos(angle),
                uvCenterV + uvRadius * stackPercentage * Math.sin(angle)
            );
        }
    
        for (let currentStack = 1; currentStack < stacks; currentStack++) {
            const currentRadius = (currentStack + 1) * stackRadius;
            stackPercentage = (1 + currentStack) / stacks;
            stackColor = interpolateColor(color_c, color_p, stackPercentage);
            for (let currentSlice = 0; currentSlice < slices; currentSlice++) {
                const angle = (currentSlice / slices) * (2 * Math.PI);
                const x = currentRadius * Math.cos(angle);
                const y = currentRadius * Math.sin(angle);
                positions.push(x, y, 0);
                normals.push(0, 0, 1);
                colors.push(...stackColor);
    
                const currentSlicePreviousStackIdx =
                    1 + (currentStack - 1) * slices + currentSlice % slices;
                const nextSlicePreviousStackIdx =
                    1 + (currentStack - 1) * slices + (currentSlice + 1) % slices;
    
                const currentSliceIdx = 1 + currentStack * slices + currentSlice % slices;
                const nextSliceIdx = 1 + currentStack * slices + (currentSlice + 1) % slices;
    
                indices.push(
                    currentSliceIdx,
                    nextSliceIdx,
                    nextSlicePreviousStackIdx
                );
                indices.push(
                    currentSliceIdx,
                    nextSlicePreviousStackIdx,
                    currentSlicePreviousStackIdx
                );
                uvs.push(
                    uvCenterU + uvRadius * stackPercentage * Math.cos(angle),
                    uvCenterV + uvRadius * stackPercentage * Math.sin(angle)
                );
            }
        }
    
        function disposeArray() {
            this.array = null;
        }
    
        geometry.setIndex(indices);
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3).onUpload(disposeArray)
        );
        geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(normals, 3).onUpload(disposeArray)
        );
        geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3).onUpload(disposeArray)
        );
        geometry.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute(uvs, 2).onUpload(disposeArray)
        );
    
        geometry.computeBoundingSphere();

        const material = object.material
        
        const recMaterials = []
        if (material == undefined) {
            const material = new THREE.MeshBasicMaterial();
            material.side = THREE.FrontSide
            material.shadowSide = THREE.FrontSide
            recMaterials.push(material)
        }else if (material.side === THREE.DoubleSide){
            // if double sided, create two objects and materials

            const materialFront = this.cloneMaterial(material)
            materialFront.side = THREE.FrontSide
            recMaterials.push(materialFront)

            const materialBack = this.cloneMaterial(material)
            materialBack.side = THREE.BackSide
            recMaterials.push(materialBack)

        }else{
            recMaterials.push(material)
        }   

        const polygons = []

        for (let material of recMaterials){
            material.vertexColors = true

            const mesh = new THREE.Mesh(geometry, material);
            object.add(mesh);
            this.materials.push(material)
            mesh.parent = object
            polygons.push(mesh)
        }


        return polygons
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildTriangle(object, objectData){
        let xyz1 = objectData.representations[0].xyz1
        let xyz2 = objectData.representations[0].xyz2
        let xyz3 = objectData.representations[0].xyz3
        console.log(xyz1, xyz2, xyz3)
        // buffer geometry
        const triangleGeometry = new THREE.BufferGeometry();
        triangleGeometry.setAttribute(
            'position', 
            new THREE.Float32BufferAttribute([xyz1[0], xyz1[1], xyz1[2], xyz2[0], xyz2[1], xyz2[2], xyz3[0], xyz3[1], xyz3[2]], 3));
        triangleGeometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1], 3));
        triangleGeometry.computeVertexNormals();
        let material = object.material
        if (material == undefined) {
            material = new THREE.MeshBasicMaterial();
            material.side = THREE.FrontSide
            material.shadowSide = THREE.FrontSide
            this.materials.push(material)
        }else if (material.side === THREE.DoubleSide){
            material = this.cloneMaterial(material)
            material.shadowSide = THREE.BackSide
            this.materials.push(material)
        }
        const triangleMesh = new THREE.Mesh(triangleGeometry, material);
        object.add(triangleMesh);
        triangleMesh.parent = object
        return triangleMesh

    }
    
    /**
     * Builds a pointlight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     */

    buildPointlight(object, objectData){
        // light
        const pointLight = new THREE.PointLight( objectData.color, objectData.intensity);
        pointLight.decay = objectData.decay;
        pointLight.distance = objectData.distance;
        pointLight.position.set(objectData.position[0], objectData.position[1], objectData.position[2])
        pointLight.castShadow = objectData.castshadow;
        pointLight.shadow.mapSize.width = objectData.shadowmapsize;
        pointLight.shadow.mapSize.height = objectData.shadowmapsize;
        pointLight.shadow.camera.far = objectData.shadowfar;
        pointLight.name = objectData.id
        pointLight.visible = objectData.enabled
        
        object.add(pointLight)
        this.lights.push(pointLight)

        // helper
        const helper = new THREE.PointLightHelper( pointLight, 1 );
        helper.visible = false
        this.app.scene.add( helper );

        pointLight.helper = helper
    }

    /**
     * Builds a spotlight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildSpotlight(object, objectData){
        // light
        const spotlight = new THREE.SpotLight( objectData.color, objectData.intensity, 
                        objectData.distance , objectData.angle, objectData.penumbra, objectData.decay );
        spotlight.castShadow = objectData.castshadow
        spotlight.position.set(objectData.position[0], objectData.position[1], objectData.position[2])
        spotlight.target.position.set(objectData.target[0], objectData.target[1], objectData.target[2])

        spotlight.shadow.mapSize.width = objectData.shadowmapsize
        spotlight.shadow.mapSize.height = objectData.shadowmapsize
        spotlight.shadow.camera.far = objectData.shadowfar;
        spotlight.name = objectData.id
        spotlight.visible = objectData.enabled
        
        object.add(spotlight)
        this.lights.push(spotlight) 

        // helper
        const spotlightHelper = new THREE.SpotLightHelper( spotlight );
        spotlightHelper.visible = false
        this.app.scene.add( spotlightHelper );

        spotlight.helper = spotlightHelper
    }

    /**
     * Builds a directionallight
     * @param {THREE.Object3D} object The scene group
     * @param {Object} objectData The object data
     * @returns {void}
     */

    buildDirectionallight(object, objectData){
        // light
        const directionallight = new THREE.DirectionalLight( objectData.color, objectData.intensity );
        directionallight.position.set(objectData.position[0], objectData.position[1], objectData.position[2])
        directionallight.castShadow = objectData.castshadow
        directionallight.shadow.mapSize.width = objectData.shadowmapsize
        directionallight.shadow.mapSize.height = objectData.shadowmapsize

        directionallight.shadow.camera.left = objectData.shadowleft;
        directionallight.shadow.camera.right = objectData.shadowright;
        directionallight.shadow.camera.bottom = objectData.shadowbottom;
        directionallight.shadow.camera.top = objectData.shadowtop;
        directionallight.shadow.camera.far = objectData.shadowfar;
        directionallight.name = objectData.id
        directionallight.visible = objectData.enabled


        object.add(directionallight)
        this.lights.push(directionallight)

        // helper

        const helper = new THREE.DirectionalLightHelper( directionallight, 1 );
        helper.visible = false
        this.app.scene.add( helper );

        directionallight.helper = helper


    }
       
}