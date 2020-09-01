import React, { Component } from 'react';
import '../../assets/css/pages/Miku.scss';
import 'three/examples/js/WebGL';
import 'three/examples/js/loaders/TGALoader'; // pmx貌似要用到的插件
import 'three/examples/js/loaders/MMDLoader'; // mmd加载器
import 'three/examples/js/libs/ammo'; // ammo物理引擎
import 'three/examples/js/animation/MMDPhysics'; // mmd物理引擎
import 'three/examples/js/animation/CCDIKSolver'; // mmd关联插件
import 'three/examples/js/animation/MMDAnimationHelper'; // 动画运行helperF
import 'three/examples/js/effects/OutlineEffect'; // 轮廓
import 'three/examples/js/controls/OrbitControls'; // 控制器
import 'three/examples/js/objects/Reflector'; // 镜子
import 'three/examples/js/objects/Sky'; // 天空
import 'three/examples/js/objects/Water'; // 天空
import Progress from '../../utils/Progress';
// fps 检测
import Stats from '@/plugins/stats.min';
// gui 控制器
import dat from 'dat.gui';

import { notification } from 'antd';

import * as THREE from 'three';

import PmxWorker from './pmx.worker';
import VmdWorker from './vmd.worker';

class Miku extends Component {
  state = {
    begin: false,
    ready: false,
  };
  constructor(props) {
    super(props);

    this.baseWidth = window.innerWidth; // 获取屏幕宽
    this.baseHeight = window.innerHeight; // 获取屏幕高度
    this.devicePixelRatio = window.devicePixelRatio;
    this.distance = 400000;
    this.groundReflector = null;
    this.groundGrid = null;
    this.groundPlane = null;
    this.endTime = 4 * 60 * 1000; // 歌曲结束时间
    /*镜面分辨率 值越大镜面越清晰 默认1 如需提升可设置2
     *测试数据单位FPS
     *镜面倍率4 : 23.77  32.12  26.74  ∑  27.54  0%
     *镜面倍率2 : 47.53  47.09  44.24  ∑  46.28  68.1%
     *镜面倍率1 : 52.71  49.01  54.18  ∑  51.96  12.2%
     */
    this.mirrorPixelRatio = 1;

    // 天气控制
    this.effectController = {
      turbidity: 10, // 天气浑浊度 光源扩散大小
      rayleigh: 2, // 大气散射
      mieCoefficient: 0.005, //该数越大，天空越暗
      mieDirectionalG: 0.8, //该数越大，太阳越小
      luminance: 1, // 亮度
      inclination: 0.2449, // elevation / inclination
      azimuth: 0.3133, // Facing front,
      sun: false, // 是否显示太阳
    };
    // 模型控制
    this.modelController = {
      cameraAnimation: null,
      sound: 50,
      stop: false,
    };
    // 地面控制
    this.planeController = {
      reflector: true,
      grid: true,
      plane: false,
      sceneReflector: () => {
        this.initReflector();
      },
      sceneGrid: () => {
        this.initGrid();
      },
      scenePlane: () => {
        this.initPlane();
      },
    };
    this.audioParams = { delayTime: (25 * 1) / 30 }; // 动作有点延迟，所以加上去
    // 模型
    this.mikuModel = {
      modelFile: require('../../assets/model/miku10th/YYB Hatsune Miku_10th_v1.02.pmx'), // 任务模型
      vmdFiles: [require('../../assets/model/FREELY_TOMORROW/action.vmd')], // 动作
      audioFile: require('../../assets/model/FREELY_TOMORROW/FREELY TOMORROW.mp3'), // 音频
      position: { x: 0, y: 0, z: 0 }, // 设置模型位置
      cameraFile: require('../../assets/model/FREELY_TOMORROW/camera.vmd'), // 摄像头
    };
    this.skyChanged = this.skyChanged.bind(this);
  }
  async componentDidMount() {
    // three 提供了很多特殊功能比如天空，镜子，反射等
    // https://github.com/mrdoob/three.js/tree/master/examples/js/objects
    this.init();
    this.initCamera();
    this.initSence();
    this.initRenderer();
    this.initOutline();
    this.initLight();
    this.initSky();
    this.initReflector();
    this.initGrid();
    this.initListener();
    this.initMMD();
    this.initControls();
    this.initGui();
    this.run();
  }
  componentWillUnmount() {
    // 该函数作用:查找摄像机  音频 动作数据 模块 中最长的时间 当到达最最长时间 所有都停止 如果未设置 则模块到达自己结束时间停止 不会同步
    if (this.audio) {
      this.audio.disconnect();
    }
  }
  init() {
    // 秒表 秒表在运行过程中起关键性作用，能决定动画音乐运行，以及帧数显示
    console.log('init');
    this.clock = new THREE.Clock();
    this.clock.stop();
    const progress = new Progress();
    console.log('init2', progress);
    progress.init((msg) => {
      console.log('init----------------->', msg);
      if (!msg.ok && msg.over) {
        notification['error']({
          message: `错误提示`,
          description: `${msg.file_type}失败`,
        });
      }
      if (msg.over) {
        notification['success']({
          message: `消息提示`,
          description: `${msg.file_type}加载成功`,
        });
      }
    });
    this.onProgress = progress.onProgress;
    this.onError = progress.onError;
  }
  initSence() {
    console.log('initSence');

    // 场景
    let scene = (this.scene = new THREE.Scene());
    // 设置背景颜色
    scene.background = new THREE.Color(0xffffff);
    // var axes = new THREE.AxesHelper(10);
    // this.scene.add(axes);
  }
  initCamera() {
    console.log('initCamera');

    // 透视摄像机 https://www.hangge.com/blog/cache/detail_1787.html
    /**
     * @param fov 这是在摄像机中能够看到的那部分场景。
     * @param aspect 长宽比 这是渲染结果的横向尺寸和纵向尺寸的比值。这个长宽比决定了横向视场和纵向视场的比例关系。
     * @param near 近面距离 该属性定义了从距离摄像机多近的距离开始渲染。
     * @param fov 圆面距离 该属性定义了摄像机从它所出的位置能够看多远。
     */
    this.camera = new THREE.PerspectiveCamera(45, this.baseWidth / this.baseHeight, 1, 6000);
    this.camera.position.set(0, 20, 50); // 设置摄像机的位置
  }
  initRenderer() {
    // 渲染器 WebGL Render 用WebGL渲染出你精心制作的场景。
    // https://threejs.org/docs/index.html#api/zh/renderers/WebGLRenderer
    // antialias 抗锯齿
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(this.devicePixelRatio); // 设置设备像素比。通常用于避免HiDPI设备上绘图模糊
    this.renderer.setSize(this.baseWidth, this.baseHeight); // 设置canvas的宽高
    this.renderer.shadowMap.enabled = true; // 允许在场景中使用阴影贴图
    // 添加canvas到div标签
    this.container.appendChild(this.renderer.domElement);
    this.renderer.render(this.scene, this.camera); // 开始绘制场景以及相机
  }
  initOutline() {
    // 外部轮廓线 相当于构图
    this.effect = new THREE.OutlineEffect(this.renderer);
  }
  initLight() {
    // 灯光的api https://www.hangge.com/blog/cache/detail_1810.html
    // 灯光shadow的api http://www.yanhuangxueyuan.com/threejs/docs/index.html#api/zh/lights/shadows/LightShadow
    // (环境光)设置灯光以及颜色
    let ambient = (this.ambient = new THREE.AmbientLight(0x666666));
    this.scene.add(ambient); // 将灯光添加到场景中
    // // (聚光灯)
    // let spotLight = (this.spotLight = new THREE.SpotLight(0x223344));
    // spotLight.position.set(5, 30, 15); // 聚光灯位置
    // spotLight.angle = 0.8; // 光线散射角度，最大为Math.PI/2
    // spotLight.intensity = 0.7; // 光照强度
    // spotLight.penumbra = 0.8; // 聚光锥的半影衰减百分比
    // spotLight.castShadow = true; // 是否开启聚光灯的投射阴影
    // // 用来偏置阴影的位置。当你使用非常薄的对象时，可以使用它来解决一些奇怪的效果。如果你看到奇怪的阴影效果，将该属性设置为很小的值（例如 0.01）通常可以解决问题。此属性的默认值为 0
    // spotLight.shadow.bias = -0.001;
    // spotLight.name = 'spotLight';

    // (平行光) 光线是直射形，类似太阳光
    let directionalLight = (this.directionalLight = new THREE.DirectionalLight(0x887766));
    directionalLight.position.set(-30, 65, 70); // 设置光源位置
    directionalLight.castShadow = true; // 开启平行光的阴影
    //设置阴影分辨率
    directionalLight.shadow.mapSize.x = 1024 * 2;
    directionalLight.shadow.mapSize.y = 1024 * 2;
    // camera 就是设置光的角度
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.001;
    directionalLight.name = 'directionalLight';
    // 默认为true。是否将材质所指定的反面渲染到阴影贴图中。
    // 如果禁用，必须在表面光源上设置适当的shadow.bias，可以同时投射和接收阴影以正确渲染。
    this.renderer.shadowMap.renderSingleSided = false;
    // 默认为true。是否将指定的材料视为双面，而在渲染阴影贴图时使用正面(front-side)。
    // 如果禁用，必须在表面光源上设置适当的shadow.bias，可以同时投射和接受阴影以正确渲染。
    this.renderer.shadowMap.renderReverseSided = false;
    this.scene.add(directionalLight);
    // 平行光辅助对象，用了之后会出现一条辅线，对应平行光的方向，其他光源也有类似方法
    // let directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight);
    // this.scene.add(directionalLightHelper);
  }
  initSky() {
    // 天空
    let sky = (this.sky = new THREE.Sky());
    // 将背景放大4500倍
    // 天空本身是个小盒子，将盒子放大4500倍即呈现在天上的效果
    sky.scale.setScalar(4500);
    sky.position.z = 30; // 天空Z轴上升30像素
    this.scene.add(sky); // 将天空加入场景

    // 创建太阳，圆形几何球体
    let sunSphere = (this.sunSphere = new THREE.Mesh(
      new THREE.SphereBufferGeometry(20000, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    ));
    sunSphere.position.y = -700000; // 设置太阳位置
    sunSphere.visible = false;
    this.skyChanged();
    this.scene.add(sunSphere); // 加入场景
  }
  initControls() {
    // 有camera脚本时还添加这个，是为了控制摄像头的移动范围
    let controls = (this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)); // 圆形场景控制器
    // controls.enableZoom = false; // 允许缩放
    // controls.enablePan = false; // 允许使用摄像机
    // controls.target = new THREE.Vector3(0, 0, 0); // 位置
    // 阻尼惯性
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    // 这个应该是阻尼参数
    controls.dampingFactor = 0.25;
    // 定义平移时摄像机位置的平移方式
    controls.screenSpacePanning = false;
    // 最近 最远视距
    controls.minDistance = 60;
    controls.maxDistance = 100;
    // 可以垂直滑动下限
    controls.maxPolarAngle = Math.PI / 2;
  }
  initGui() {
    // 这个默认会放在顶端
    let gui = (this.gui = new dat.GUI({ autoPlace: false }));
    // 可出现储存模式，还可以分组储存
    let sky_gui = gui.addFolder('天气设置');
    sky_gui
      .add(this.effectController, 'luminance', 0.0, 2)
      .onChange(this.skyChanged)
      .name('亮度');
    sky_gui
      .add(this.effectController, 'inclination', 0, 1, 0.0001)
      .onChange(this.skyChanged)
      .name('倾斜');
    sky_gui
      .add(this.effectController, 'azimuth', 0, 1, 0.0001)
      .onChange(this.skyChanged)
      .name('方位角');
    sky_gui
      .add(this.effectController, 'sun')
      .onChange(this.skyChanged)
      .name('太阳');
    let model_gui = gui.addFolder('模型设置');
    model_gui
      .add(this.modelController, 'sound', 0, 100)
      .step(1)
      .name('音量')
      .onChange(() => {
        this.audio.setVolume(this.modelController.sound.toFixed(2) / 100);
      });
    model_gui
      .add(this.modelController, 'stop')
      .name('暂停')
      .onChange(() => {
        const isPlaying = this.audio.isPlaying;
        console.log('hasPlaybackControl', this.audio.hasPlaybackControl);
        console.log('isPlaying', isPlaying);
        if (isPlaying) {
          this.clock.stop();
          this.audio.pause();
        } else {
          this.clock.start();
          this.audio.play();
        }
      });

    let plane_gui = gui.addFolder('地面设置');
    plane_gui
      .add(this.planeController, 'reflector')
      .name('镜面')
      .onChange(() => {
        this.initReflector();
      });
    plane_gui
      .add(this.planeController, 'grid')
      .name('网格')
      .onChange(() => {
        this.initGrid();
      });
    plane_gui
      .add(this.planeController, 'plane')
      .name('地面')
      .onChange(() => {
        this.initPlane();
      });
    gui.domElement.style = 'position:absolute;top:0px;right:0px';
    this.container.append(gui.domElement);
  }
  initReflector() {
    let groundReflector = this.groundReflector;
    // 建立网格
    if (!groundReflector) {
      let textureWidth = this.baseWidth * this.mirrorPixelRatio * this.devicePixelRatio;
      let textureHeight = this.baseHeight * this.mirrorPixelRatio * this.devicePixelRatio;
      // 矩形 宽高100x100
      let geometry = new THREE.PlaneBufferGeometry(100, 100);
      // 倒影引擎 https://github.com/mrdoob/three.js/blob/master/examples/js/objects/Reflector.js
      groundReflector = this.groundReflector = new THREE.Reflector(geometry, {
        clipBias: 0.003, // clipBias参数是对裁剪面进行了一个偏移 算法参考http://www.terathon.com/code/oblique.html
        textureWidth,
        textureHeight,
        color: 0x777777,
      });
      // 镜子本身是竖着的，需要翻转180度
      groundReflector.rotateX(-Math.PI / 2);
      groundReflector.name = 'plane';
    }
    // 设置控制器开启或者关闭镜子加入场景中
    if (this.planeController.reflector) {
      this.scene.add(groundReflector);
    } else {
      this.scene.remove(groundReflector);
      this.groundReflector = null;
    }
  }
  initPlane() {
    let groundPlane = this.groundPlane;
    if (!groundPlane) {
      // 矩形 宽高100x100
      let geometry = new THREE.PlaneBufferGeometry(100, 100);
      // 创建一个白色的材质
      let material = new THREE.MeshPhongMaterial({ color: 0xffffff, depthWrite: false }); // 在绘制二维覆盖图时，depthWrite 禁用深度写入可以很有用
      // 生成平面，也就是地面
      groundPlane = this.groundPlane = new THREE.Mesh(geometry, material);
      groundPlane.position.set(0, 0, 0); // 设置位置
      groundPlane.rotation.x = -Math.PI / 2; // 平面是竖着的，偏转180度将其平方
      groundPlane.receiveShadow = true; // 是否显示阴影
    }
    console.log('this.planeController.plane', this.planeController.plane);
    // 添加或者删除地面
    if (this.planeController.plane) {
      this.scene.add(groundPlane);
    } else {
      this.scene.remove(groundPlane);
      this.groundPlane = null;
    }
  }
  initGrid() {
    // 圆形网格 http://www.yanhuangxueyuan.com/threejs/docs/index.html#api/zh/helpers/PolarGridHelper
    // let polarGridHelper = new THREE.PolarGridHelper(80, 3, 8, 64, 0xffffff, 0xffffff);
    // this.scene.add(polarGridHelper); // 网格

    // 普通网格 http://www.yanhuangxueyuan.com/threejs/docs/index.html#api/zh/helpers/GridHelper
    let groundGrid = this.groundGrid;
    if (!groundGrid) {
      groundGrid = this.groundGrid = new THREE.GridHelper(100, 8, 0x808080, 0x808080);
      groundGrid.position.y = 0;
    }
    // 设置网格是否显示
    if (this.planeController.grid) {
      this.scene.add(groundGrid);
    } else {
      this.scene.remove(groundGrid);
      this.groundGrid = null;
    }
  }
  async initMMD() {
    console.log('initMMD');
    this.mmdLoader = new THREE.MMDLoader(); // mmdloader 加载mmd模型
    this.mmdHelper = new THREE.MMDAnimationHelper(); // 动画
    let listener = new THREE.AudioListener(); // 音频监听
    let audio = (this.audio = new THREE.Audio(listener)); // 音频
    audio.setLoop(false);
    let { audioFile, cameraFile } = this.mikuModel;
    // 加载mmd模型和动画
    const mmdList = Promise.all([this.loadMMD(this.mikuModel)]);
    // 多线程加载mmd模型、摄像机、音频
    const promiseList = [mmdList, this.loadAudio(audioFile), this.loadCamera(cameraFile)];
    // 加载模型与动画
    // 这里只取第一个和第二个
    let [pmxMeshArr, audioBuffers] = await Promise.all(promiseList);
    console.log('mmd加载结果--->', pmxMeshArr, audioBuffers);
    audio.setBuffer(audioBuffers);
    listener.position.z = 1;
    this.scene.add(...pmxMeshArr);
    // 给个延迟让动画好渲染完毕
    console.log('进入ready');
    this.setState({ ready: true });
  }
  async loadMMD(mmdObj) {
    const { modelFile, vmdFiles, position } = mmdObj;
    const { x, y, z } = position;
    // const pmxMesh = await this.loadPMX(modelFile);
    const [pmxMesh, vmdAction] = await Promise.all([this.loadPMX(modelFile), this.loadVMD(vmdFiles, '动作文件')]);
    pmxMesh.scale.setScalar(0.8); // 将物体缩小至0.8
    pmxMesh.position.set(x, y, z);
    //方块和球体投射阴影
    pmxMesh.castShadow = true;
    //平面接收阴影
    pmxMesh.receiveShadow = true;
    // const vmdAction = await this.loadVMD(vmdFiles);
    console.log('vmdAction', vmdAction);
    // 模型动画
    const modelAction = this.loadAnimation(vmdAction, pmxMesh);
    // 加载动画
    this.mmdHelper.add(pmxMesh, {
      animation: modelAction, // 加载动画
      physics: true, // 物理引擎
    });
    return pmxMesh;
  }
  /**
   * 加载vmd文件
   * @param {string|Array<string>} url - url(s) to .vmd file(s)
   */
  loadVMD(vmd, msg) {
    return new Promise((resolve, reject) => {
      console.log('000000000000000', vmd);
      const worker = new VmdWorker();
      worker.postMessage(vmd);
      worker.onmessage = (res) => {
        if (res.data) {
          notification['success']({ message: `消息提示`, description: `${msg}加载成功` });
          resolve(res.data);
        } else {
          notification['error']({ message: `错误提示`, description: `${msg}加载失败` });
        }
      };
    });
  }
  loadPMX(pmx) {
    return new Promise((resolve, reject) => {
      const worker = new PmxWorker();
      worker.postMessage(pmx);
      worker.onmessage = (res) => {
        const texturePath = THREE.LoaderUtils.extractUrlBase(pmx);
        const mesh = this.mmdLoader.meshBuilder.build(res.data, texturePath);
        console.log('触发-----------------》mesh');
        if (mesh) {
          notification['success']({ message: `消息提示`, description: `模型加载成功` });
          resolve(mesh);
        } else {
          notification['error']({ message: `错误提示`, description: `模型加载失败` });
        }
      };
    });
  }
  /**
   * 加载动作生成动画对象
   * @param {Object} vmd - parsed VMD data
   * @param {THREE.SkinnedMesh|THREE.Camera} object - tracks will be fitting to this object
   */
  loadAnimation(vmd, object) {
    let animation = null;
    if (object.isCamera) {
      animation = this.mmdLoader.animationBuilder.buildCameraAnimation(vmd);
    } else {
      animation = this.mmdLoader.animationBuilder.build(vmd, object);
    }
    return animation;
  }
  /**
   * 加载音频
   * @param {Object} audioFile
   * @return {Buffer} 音频buffer
   */
  loadAudio(audioFile) {
    return new Promise((resolve, reject) => {
      // 音频loader
      new THREE.AudioLoader().load(
        audioFile,
        (buffers) => {
          resolve(buffers);
        },
        this.onProgress,
        this.onError
      );
    });
  }
  /**
   * 加载摄像头
   * @param {Object} cameraFile 摄像头文件
   */
  async loadCamera(cameraFile) {
    const vmdCamera = await this.loadVMD(cameraFile, '摄像头');
    const cameraAnimation = this.loadAnimation(vmdCamera, this.camera);
    this.mmdHelper.add(this.camera, { animation: cameraAnimation });
  }
  skyChanged() {
    let effectController = this.effectController;
    let distance = this.distance;
    console.log('this.sky', this.sky.material);
    let uniforms = this.sky.material.uniforms;
    uniforms.turbidity.value = effectController.turbidity; // 浑浊度 光源扩散大小
    uniforms.rayleigh.value = effectController.rayleigh; //大气散射
    uniforms.luminance.value = effectController.luminance; // 亮度
    uniforms.mieCoefficient.value = effectController.mieCoefficient; // 散射系数 该数越大，天空越暗
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG; //该数越大，太阳越小

    let theta = Math.PI * (effectController.inclination - 0.5); //太阳 倾斜角度
    let phi = 2 * Math.PI * (effectController.azimuth - 0.5); // 太阳方位 想象一下天使的光环

    this.sunSphere.position.x = distance * Math.cos(phi);
    this.sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    this.sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    this.sunSphere.visible = effectController.sun; // 控制太阳是否显示

    uniforms.sunPosition.value.copy(this.sunSphere.position);
  }
  run() {
    let renderCount = 1;
    let oldTime1 = 0;
    let newTime1 = 0;
    let fpsbox = this.fpsbox;
    console.log('fpsbox', fpsbox);
    const animate = () => {
      requestAnimationFrame(animate);
      render();
    };
    const render = () => {
      if (this.state.ready) {
        // 获取时钟的时间，并且更新动画
        this.mmdHelper.update(this.clock.getDelta());
      }
      // 三十次渲染计算一次fps
      if (renderCount % 30 == 0) {
        renderCount = 0;
        newTime1 = Date.now();
        // 30次渲染也就是3秒计算一次
        fpsbox.innerHTML = 'FPS:' + Math.round(30000 / (newTime1 - oldTime1));
        oldTime1 = newTime1;
      }
      renderCount++;
      this.controls.update();
      this.effect.render(this.scene, this.camera);
    };
    animate();
  }
  initListener() {
    const onWindowResize = () => {
      console.log('resize', window.innerWidth, window.innerHeight);
      // 动态改变相机长宽比
      this.camera.aspect = window.innerWidth / window.innerHeight;
      // 更新相机投影矩阵，必须在参数发生变化后调用。
      this.camera.updateProjectionMatrix();
      // 重新绘制canvas大小 下面两个效果一样
      //   this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.effect.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize, false);
  }
  start = () => {
    console.log('start');
    this.clock.start(); // 动画开始
    setTimeout(() => {
      // 音乐结束就停止
      this.clock.stop();
    }, this.endTime + this.audioParams.delayTime * 1000);
    setTimeout(() => {
      // 画 音同步
      this.audio.play();
    }, this.audioParams.delayTime * 1000);
    this.setState({ begin: true });
  };
  render() {
    const { begin, ready } = this.state;
    return (
      <div className="miku">
        {!begin && (
          <div className="mask">
            {ready ? (
              <img src={require('../../assets/images/begin.png')} className="begin" onClick={this.start} />
            ) : (
              <img src={require('../../assets/images/loading2.png')} className="loading" />
            )}
          </div>
        )}
        <div className="fps-box">
          <span className="fps" ref={(fpsbox) => (this.fpsbox = fpsbox)} />
        </div>
        <div ref={(container) => (this.container = container)} />
      </div>
    );
  }
}
export default Miku;
