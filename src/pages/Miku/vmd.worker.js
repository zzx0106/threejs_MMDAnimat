onmessage = function({ data: vmd }) {
  require('three');
  this.MMDParser = require('mmd-parser');
  require('three/examples/js/loaders/MMDLoader');
  const Progress = require('../../utils/Progress').default;
  const progress = new Progress();
  progress.init((r) => {
    if (!r.ok && r.over) postMessage(null);
    console.log('vmd loading--->', r);
  });
  const mmd = new THREE.MMDLoader();
  console.log('vmd.worker params', vmd);
  mmd.loadVMD(
    vmd,
    (loaded) => {
      console.log('进入这里。。');
      postMessage(loaded);
    },
    progress.onProgress,
    progress.onError
  );
};
