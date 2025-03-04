/**
 * @author alteredq / http://alteredqualia.com/
 */

/**
 * RenderPass
 * @param scene
 * @param camera
 * @param overrideMaterial
 * @param clearColor
 * @param clearAlpha
 * @constructor
 */
THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 1;

	this.oldClearColor = new THREE.Color();
	this.oldClearAlpha = 1;

	this.enabled = true;
	this.clear = true;
	this.needsSwap = false;

};

/**
 * render
 * @param renderer
 * @param writeBuffer
 * @param readBuffer
 * @param delta
 */
THREE.RenderPass.prototype.render = function (renderer, writeBuffer, readBuffer, delta) {

	this.scene.overrideMaterial = this.overrideMaterial;

	if (this.clearColor) {

		this.oldClearColor.copy(renderer.getClearColor());
		this.oldClearAlpha = renderer.getClearAlpha();

		renderer.setClearColor(this.clearColor, this.clearAlpha);

	}

	renderer.render(this.scene, this.camera, readBuffer).clear();

	if (this.clearColor) {

		renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);

	}

	this.scene.overrideMaterial = null;
};
