onmessage = function({ data: pmx }) {
  require('three');
  this.MMDParser = require('mmd-parser');
  require('three/examples/js/loaders/MMDLoader');
  const Progress = require('../../utils/Progress').default;
  const progress = new Progress();
  progress.init((r) => {
    if (!r.ok && r.over) postMessage(null);
    console.log('pmx loading--->', r);
  });
  const mmd = new THREE.MMDLoader();
  console.log('pmx.worker params', pmx);
  mmd.loadPMX(
    pmx,
    (loaded) => {
      postMessage(loaded);
    },
    progress.onProgress,
    progress.onError
  );
};
