class Progress {
  constructor() {
    this.isInit = false;
    this.callback = null;
    this.onProgress = this.onProgress.bind(this);
    this.onError = this.onError.bind(this);
  }
  /**
     * 初始化
     * @param {Function} callback 加载时的回调函数
     * @return {Object} {
        file_name, 
        file_type, 
        progress,  
        ok,        
     * }
     */
  init(callback) {
    if (!callback) {
      callback = function cb(msg) {
        console.log(msg);
      };
    }
    this.callback = callback;
    this.isInit = true;
  }
  onProgress(xhr) {
    if (!this.isInit) return console.error('The Progress bar must be initialized first.');
    let url = decodeURI(xhr.target.responseURL);
    let fileName = url.substr(url.lastIndexOf('/') + 1);
    let fileType = url.substr(url.lastIndexOf('.') + 1);
    switch (fileType) {
      case 'pmx':
        fileType = 'pmx模型文件';
        break;
      case 'pmd':
        fileType = 'pmd模型文件';
        break;
      case 'obj':
        fileType = 'obj模型文件';
        break;
      case 'vmd':
        fileType = '动作文件';
        break;
      case 'tga':
        fileType = 'tga文件';
        break;
      case 'mp3':
        fileType = '音频文件';
        break;
      case 'wav':
        fileType = '音频文件';
        break;
      default:
        fileType = '其他文件';
    }
    // 长度是否可计算
    if (xhr.lengthComputable) {
      // 如果加载的长度 === 总长度 ? 加载完成 : 加载中
      if (xhr.loaded === xhr.total) {
        this.callback({
          file_name: fileName,
          file_type: fileType,
          progress: 100,
          over: true,
          ok: true,
        });
      } else {
        this.callback({
          file_name: fileName,
          file_type: fileType,
          progress: Math.round((xhr.loaded / xhr.total) * 100),
          over: false,
          ok: true,
        });
      }
    } else {
      this.callback({
        file_name: fileName,
        file_type: fileType,
        progress: 0,
        over: false,
        ok: false,
      });
    }
  }
  //加载失败  所有的加载都调用此函数
  onError(xhr) {
    if (!this.isInit) return console.error('The Progress bar must be initialized first.');
    var url = decodeURI(xhr.target.responseURL);
    fileName = url.substr(url.lastIndexOf('/') + 1);
    this.callback({
      file_name: fileName,
      file_type: fileType,
      progress: 0,
      over: false,
      ok: false,
    });
  }
}
export default Progress;
