const editor = window.editor;

console.log('editorMessagePassing.js loaded');
let timeout;
function sendStateToParent() {
  clearTimeout(timeout);

  timeout = setTimeout(function () {
    editor.signals.savingStarted.dispatch();

    timeout = setTimeout(function () {
      editor.storage.set(editor.toJSON());

      editor.signals.savingFinished.dispatch();
    }, 100);
  }, 1000);

  timeout = setTimeout(function () {
    timeout = setTimeout(function () {
      window.parent.postMessage(editor.toJSON(), '*');
    }, 100);
  }, 1000);
}

const signals = editor.signals;

signals.geometryChanged.add(sendStateToParent);
signals.objectAdded.add(sendStateToParent);
signals.objectChanged.add(sendStateToParent);
signals.objectRemoved.add(sendStateToParent);
signals.materialChanged.add(sendStateToParent);
signals.sceneBackgroundChanged.add(sendStateToParent);
signals.sceneEnvironmentChanged.add(sendStateToParent);
signals.sceneFogChanged.add(sendStateToParent);
signals.sceneGraphChanged.add(sendStateToParent);
signals.scriptChanged.add(sendStateToParent);
signals.historyChanged.add(sendStateToParent);

window.addEventListener('message', (event) => {
  if (event.data.type === 'editor iFrame setState') {
    editor.clear();
    editor.fromJSON(event.data.state);
  }
  if (event.data.type === 'editor iFrame setObjectPositionRotationScale') {
    const { objectName, rotationQuaternion, position, scale } = event.data;
    const object = editor.scene.getObjectByName(objectName);
    if (object) {
      if (position) {
        object.position.set(position.x, position.y, position.z);
      }
      if (rotationQuaternion) {
        object.rotation.setFromQuaternion(rotationQuaternion);
      }
      if (scale) {
        object.scale.set(scale);
      }
    }
    editor.signals.objectChanged.dispatch(object);
  }
});
window.parent.postMessage({ type: 'editor iFrame loaded' }, '*');
