import * as THREE from 'three';
import { MyApp } from './MyApp.js';

/**
 * This class contains a 3D axis representation
 */
class MyAxis extends THREE.Object3D {

    /**
     * 
     * @param {MyApp} app the application object
     * @param {number} size the size of each axis 
     * @param {number} baseRadius the base radius of each axis
     * @param {number} xxColor the hexadecimal representation of the xx axis color
     * @param {number} yyColor the hexadecimal representation of the xx axis color
     * @param {number} zzColor the hexadecimal representation of the zz axis color
     */
    constructor(app, size, baseRadius, xxColor, yyColor, zzColor) {
        super();
        this.app = app;
        this.type = 'Group';
        this.size = size || 2;
        this.baseRadius = baseRadius || 0.05;
        this.xxColor = xxColor || 0xff0000
        this.yyColor = yyColor || 0x00ff00
        this.zzColor = zzColor || 0x0000ff

        // a cone geometry for the xx axis
        const xx = new THREE.ConeGeometry( this.baseRadius, this.size, 32 ); 
        const xxMaterial = new THREE.MeshBasicMaterial( {color: this.xxColor} );
        const xxMesh = new THREE.Mesh(xx, xxMaterial ); 
        xxMesh.position.set(this.size/2,0,0);
        xxMesh.rotation.z = -Math.PI / 2;
        this.add( xxMesh );

        // a cone geometry for the yy axis
        const yy = new THREE.ConeGeometry( this.baseRadius, this.size, 32 ); 
        const yyMaterial = new THREE.MeshBasicMaterial( {color: this.yyColor} );
        const yyMesh = new THREE.Mesh(yy, yyMaterial ); 
        yyMesh.position.set(0, this.size/2,0);
        this.add( yyMesh );

        // a cone geometry for the zz axis
        const zz = new THREE.ConeGeometry( this.baseRadius, this.size, 32 ); 
        const zzMaterial = new THREE.MeshBasicMaterial( {color: this.zzColor} );
        const zzMesh = new THREE.Mesh(zz, zzMaterial ); 
        zzMesh.position.set(0,0,this.size/2);
        zzMesh.rotation.x = Math.PI / 2;
        this.add( zzMesh ); 

        // an axis helper
        const axesHelper = new THREE.AxesHelper( 5 );
        axesHelper.setColors ( new THREE.Color( this.xxColor ),  new THREE.Color( this.yyColor ),  new THREE.Color( this.zzColor ))
        this.add( axesHelper );
    }
}

MyAxis.prototype.isGroup = true;

export { MyAxis };