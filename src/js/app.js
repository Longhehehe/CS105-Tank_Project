const lanes = [-4, 0, 4];
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6a4b36);
scene.fog = new THREE.FogExp2(0x6a4b36, 0.0115);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 360);
camera.position.set(0, 7.2, 14);
const cameraBasePosition = camera.position.clone();
const cameraShakeOffset = new THREE.Vector3();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
document.body.appendChild(renderer.domElement);

let composer, customColorPass;
function initPostProcessing() {
  if (!THREE.EffectComposer) return;
  composer = new THREE.EffectComposer(renderer);

  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.18, 0.9);
  composer.addPass(bloomPass);

  const colorGradeShader = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      void main() {
        vec4 tex = texture2D(tDiffuse, vUv);
        vec3 color = tex.rgb;
        color = pow(color, vec3(0.95));
        color = smoothstep(0.0, 1.0, color);
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        vec3 warmTint = vec3(1.08, 1.03, 0.94);
        vec3 greenTint = vec3(0.96, 1.08, 0.9);
        color = mix(color, color * warmTint, 0.18);
        color = mix(color, color * greenTint, luma * 0.16);
        color = mix(vec3(luma), color, 1.08);
        color *= 1.02;
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a);
      }
    `
  };
  customColorPass = new THREE.ShaderPass(colorGradeShader);
  composer.addPass(customColorPass);

  const filmPass = new THREE.FilmPass(0.12, 0.0, 0, false);
  composer.addPass(filmPass);

  const vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
  vignettePass.uniforms.offset.value = 0.0;
  vignettePass.uniforms.darkness.value = 1.0;
  composer.addPass(vignettePass);
}

// Khoi tao post-processing sau khi scene co canvas; fallback ve renderer goc neu extension loi.
setTimeout(() => {
  try {
    initPostProcessing();
  } catch (error) {
    console.error('Post-processing disabled:', error);
    composer = null;
    customColorPass = null;
  }
}, 500);

const ambientLight = new THREE.AmbientLight(0xffdfaa, 1.0);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffe0b0, 1.52);
sun.position.set(-14, 24, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
scene.add(sun);

const fillLight = new THREE.HemisphereLight(0xf2d59a, 0x5d5638, 0.94);
scene.add(fillLight);

const renderables = new Set();
let currentRenderMode = 'solid';

const materials = {
  road: new THREE.MeshStandardMaterial({ color: 0x6f3b22, roughness: 0.92, metalness: 0.02 }),
  roadEdge: new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.96 }),
  mud: new THREE.MeshStandardMaterial({ color: 0x6f351d, roughness: 1 }),
  sideGround: new THREE.MeshStandardMaterial({ color: 0x3f4f27, roughness: 0.98 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x1a3318, roughness: 0.95 }),
  jungle: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, vertexColors: true, emissive: 0x24451d, emissiveIntensity: 0.42 }),
  jungleDeep: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, vertexColors: true, emissive: 0x163214, emissiveIntensity: 0.34 }),
  jungleTip: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, vertexColors: true, emissive: 0x3e5a18, emissiveIntensity: 0.46 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.96, vertexColors: true }),
  tank: new THREE.MeshStandardMaterial({ color: 0x2e4420, roughness: 0.82, metalness: 0.2 }),
  tankDark: new THREE.MeshStandardMaterial({ color: 0x141a0e, roughness: 0.88, metalness: 0.22 }),
  tankLight: new THREE.MeshStandardMaterial({ color: 0x4a5e2e, roughness: 0.8, metalness: 0.14 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3e4240, roughness: 0.6, metalness: 0.55 }),
  shell: new THREE.MeshStandardMaterial({ color: 0xf7d36d, emissive: 0x6d3e00, emissiveIntensity: 0.35 }),
  crater: new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x4a4035, roughness: 0.98 }),
  enemy: new THREE.MeshStandardMaterial({ color: 0x4a5530, roughness: 0.85 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x8a6540, roughness: 0.85 }),
  red: new THREE.MeshStandardMaterial({ color: 0x8c1f18, roughness: 0.75 }),
  smoke: new THREE.MeshStandardMaterial({ color: 0x3a3530, transparent: true, opacity: 0.55, depthWrite: false }),
  water: new THREE.MeshStandardMaterial({ color: 0x2a4040, roughness: 0.3, metalness: 0.08 }),
  sandbag: new THREE.MeshStandardMaterial({ color: 0x6b5c3e, roughness: 0.98 }),
  barrel: new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.7, metalness: 0.4 }),
  barrelRust: new THREE.MeshStandardMaterial({ color: 0x5a2d1a, roughness: 0.9, metalness: 0.2 }),
  fire: new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.2, transparent: true, opacity: 0.7, depthWrite: false }),
  mountain: new THREE.MeshStandardMaterial({ color: 0x4a3d2e, roughness: 1, fog: true }),
  aircraft: new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.6, metalness: 0.5 })
};

if (THREE.Cache) {
  THREE.Cache.enabled = true;
}

const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
const textureAssets = {
  muddyGround: {
    color: 'assets/textures/Ground054/Ground054_1K-JPG_Color.jpg',
    normal: 'assets/textures/Ground054/Ground054_1K-JPG_NormalGL.jpg',
    roughness: 'assets/textures/Ground054/Ground054_1K-JPG_Roughness.jpg'
  },
  mossGround: {
    color: 'assets/textures/Ground037/Ground037_1K-JPG_Color.jpg',
    normal: 'assets/textures/Ground037/Ground037_1K-JPG_NormalGL.jpg',
    roughness: 'assets/textures/Ground037/Ground037_1K-JPG_Roughness.jpg'
  },
  rustyMetal: {
    color: 'assets/textures/Metal063/Metal063_1K-JPG_Color.jpg',
    normal: 'assets/textures/Metal063/Metal063_1K-JPG_NormalGL.jpg',
    roughness: 'assets/textures/Metal063/Metal063_1K-JPG_Roughness.jpg',
    metalness: 'assets/textures/Metal063/Metal063_1K-JPG_Metalness.jpg'
  },
  tankCamo: {
    color: 'assets/textures/tank_camo.svg',
    normal: 'assets/textures/Metal063/Metal063_1K-JPG_NormalGL.jpg',
    roughness: 'assets/textures/Metal063/Metal063_1K-JPG_Roughness.jpg',
    metalness: 'assets/textures/Metal063/Metal063_1K-JPG_Metalness.jpg'
  }
};

function configureTexture(texture, repeat = [1, 1], useSrgb = false) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = Math.min(maxAnisotropy, 8);
  if (useSrgb) {
    if (THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else {
      texture.encoding = THREE.sRGBEncoding;
    }
  }
  return texture;
}

function loadGameTexture(path, repeat, useSrgb = false) {
  const texture = textureLoader.load(
    path,
    () => { texture.needsUpdate = true; },
    undefined,
    (error) => console.warn('Khong tai duoc texture:', path, error)
  );
  return configureTexture(texture, repeat, useSrgb);
}

function applyTextureSetToMaterial(material, textureSet, options = {}) {
  const repeat = options.repeat || [1, 1];
  if (options.tint !== undefined) {
    material.color.setHex(options.tint);
  }
  if (options.emissive !== undefined) {
    material.emissive.setHex(options.emissive);
    material.emissiveIntensity = options.emissiveIntensity ?? 0.08;
  }
  if (options.useColorMap === false) {
    material.map = null;
  } else {
    material.map = loadGameTexture(textureSet.color, repeat, true);
  }
  if (textureSet.normal) {
    material.normalMap = loadGameTexture(textureSet.normal, repeat, false);
    const normalScale = options.normalScale ?? 0.7;
    material.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  if (textureSet.roughness) {
    material.roughnessMap = loadGameTexture(textureSet.roughness, repeat, false);
  }
  if (textureSet.metalness) {
    material.metalnessMap = loadGameTexture(textureSet.metalness, repeat, false);
  }
  material.needsUpdate = true;
}

function applyDefaultTextures() {
  applyTextureSetToMaterial(materials.road, textureAssets.muddyGround, { repeat: [1.15, 8.5], normalScale: 0.62, tint: 0x9a512c });
  applyTextureSetToMaterial(materials.roadEdge, textureAssets.muddyGround, { repeat: [0.9, 8.5], normalScale: 0.48, tint: 0x7d4b2a });
  applyTextureSetToMaterial(materials.mud, textureAssets.muddyGround, { repeat: [3.2, 3.2], normalScale: 0.45, tint: 0x7a3b21 });
  applyTextureSetToMaterial(materials.sideGround, textureAssets.mossGround, { repeat: [5.5, 7.5], normalScale: 0.45, tint: 0x586c37 });
  applyTextureSetToMaterial(materials.grass, textureAssets.mossGround, { repeat: [5, 5], normalScale: 0.5, tint: 0x78995a });
  applyTextureSetToMaterial(materials.tank, textureAssets.tankCamo, { repeat: [1.7, 1.7], normalScale: 0.35, tint: 0xf0efc7, emissive: 0x253514, emissiveIntensity: 0.12 });
  applyTextureSetToMaterial(materials.tankDark, textureAssets.tankCamo, { repeat: [1.45, 1.45], normalScale: 0.32, tint: 0xb8bd86, emissive: 0x1c2810, emissiveIntensity: 0.1 });
  applyTextureSetToMaterial(materials.tankLight, textureAssets.tankCamo, { repeat: [1.25, 1.25], normalScale: 0.3, tint: 0xfff3bd, emissive: 0x2f3817, emissiveIntensity: 0.12 });
  applyTextureSetToMaterial(materials.metal, textureAssets.rustyMetal, { repeat: [1.3, 1.3], normalScale: 0.55, tint: 0xb8b8b0 });
  applyTextureSetToMaterial(materials.barrel, textureAssets.rustyMetal, { repeat: [1.1, 1.1], normalScale: 0.65, tint: 0xb0aaa0 });
  applyTextureSetToMaterial(materials.barrelRust, textureAssets.rustyMetal, { repeat: [1.1, 1.1], normalScale: 0.75, tint: 0xd29b72 });
  applyTextureSetToMaterial(materials.aircraft, textureAssets.rustyMetal, { repeat: [1.8, 1.8], normalScale: 0.4, tint: 0xb8b8b0 });
  applyTextureSetToMaterial(materials.sandbag, textureAssets.muddyGround, { repeat: [1.6, 1.6], normalScale: 0.35, tint: 0xd3bd84 });
  applyTextureSetToMaterial(materials.rock, textureAssets.muddyGround, { repeat: [1.2, 1.2], normalScale: 0.55, tint: 0xa79b8a });
  applyTextureSetToMaterial(materials.crater, textureAssets.muddyGround, { repeat: [1.4, 1.4], normalScale: 0.6, tint: 0x625848 });
  applyTextureSetToMaterial(materials.mountain, textureAssets.muddyGround, { repeat: [2, 2], normalScale: 0.45, tint: 0x776958 });
}

applyDefaultTextures();

// --- Procedural Noise cho shader ---
const glslNoise = `
// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ; m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const injectMudShader = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
varying vec3 vWPos;
varying vec3 vRoadLocal;
varying vec2 vRoadUv;
${glslNoise}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vRoadLocal = position.xyz;
    vRoadUv = uv;
    float roadHeightNoise = snoise(vec2(position.x * 0.6, position.y * 0.09));
    float roadFineNoise = snoise(vec2(position.x * 2.4, position.y * 0.34));
    float rutShape = 1.0 - smoothstep(0.12, 0.62, min(abs(abs(position.x) - 2.05), abs(position.x) * 1.35));
    transformed.z += roadHeightNoise * 0.07 + roadFineNoise * 0.018 - rutShape * 0.035;
    `
  ).replace(
    '#include <worldpos_vertex>',
    `#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
varying vec3 vWPos;
varying vec3 vRoadLocal;
varying vec2 vRoadUv;
${glslNoise}`
  ).replace(
    '#include <map_fragment>',
    `#include <map_fragment>
    float roadMacro = snoise(vWPos.xz * 0.18);
    float roadGrain = snoise(vWPos.xz * 1.85);
    float rutVisual = 1.0 - smoothstep(0.12, 0.55, min(abs(abs(vRoadLocal.x) - 2.05), abs(vRoadLocal.x) * 1.4));
    float roadEdgeFade = smoothstep(4.35, 5.75, abs(vRoadLocal.x));
    float tireCenter = 1.0 - smoothstep(0.05, 0.45, abs(vRoadLocal.x));
    vec3 packedMud = vec3(0.45, 0.23, 0.12);
    vec3 dryDust = vec3(0.56, 0.34, 0.19);
    vec3 wetMud = vec3(0.16, 0.10, 0.07);
    diffuseColor.rgb = mix(diffuseColor.rgb, dryDust, 0.24 + roadMacro * 0.08);
    diffuseColor.rgb = mix(diffuseColor.rgb, packedMud, rutVisual * 0.38);
    diffuseColor.rgb = mix(diffuseColor.rgb, wetMud, tireCenter * 0.3 + roadEdgeFade * 0.25);
    diffuseColor.rgb *= 0.9 + roadGrain * 0.12;
    `
  ).replace(
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>
    float n = snoise(vWPos.xz * 0.35);
    float n2 = snoise(vWPos.xz * 1.5);
    float mudNoise = n * 0.6 + n2 * 0.4;
    float roadRut = 1.0 - smoothstep(0.18, 0.65, min(abs(abs(vRoadLocal.x) - 2.05), abs(vRoadLocal.x) * 1.4));
    float edgeDamp = smoothstep(4.35, 5.75, abs(vRoadLocal.x));
    float wetMask = (1.0 - smoothstep(-0.2, 0.5, mudNoise)) * (0.35 + roadRut * 0.45 + edgeDamp * 0.25);

    // Damp mud without mirror-like glare.
    if (wetMask > 0.35) {
      roughnessFactor = mix(roughnessFactor, 0.42, wetMask);
    } else {
      roughnessFactor = 0.78 - mudNoise * 0.22;
    }
    `
  ).replace(
    '#include <metalnessmap_fragment>',
    `#include <metalnessmap_fragment>
    if (wetMask > 0.35) {
      metalnessFactor = max(metalnessFactor, 0.055);
    } else {
      metalnessFactor = min(metalnessFactor, 0.04);
    }
    `
  );
};

materials.road.onBeforeCompile = injectMudShader;

function setupMesh(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.defaultCastShadow = true;
  if (mesh.material) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of mats) {
      material.userData.baseOpacity = material.opacity;
      material.userData.baseTransparent = material.transparent;
    }
  }
  const points = new THREE.Points(
    mesh.geometry,
    new THREE.PointsMaterial({ color: 0xf6df91, size: 0.075, sizeAttenuation: true })
  );
  points.visible = false;
  mesh.add(points);
  mesh.userData.points = points;
  renderables.add(mesh);
  applyRenderModeToMesh(mesh, currentRenderMode);
  return mesh;
}

function removeFromScene(object) {
  if (!object) return;
  object.traverse((child) => {
    renderables.delete(child);
    if (child.userData && child.userData.points) {
      renderables.delete(child.userData.points);
    }
  });
  if (object.parent) {
    object.parent.remove(object);
  } else {
    scene.remove(object);
  }
}

function disableShadowCaster(object, receiveShadow = true) {
  object.castShadow = false;
  object.receiveShadow = receiveShadow;
  object.userData.defaultCastShadow = false;
  return object;
}

function applyRenderModeToMesh(mesh, mode) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of mats) {
    if (!material) continue;
    material.wireframe = mode === 'line';
    material.transparent = mode === 'point' ? true : Boolean(material.userData.baseTransparent);
    material.opacity = mode === 'point' ? 0.04 : (material.userData.baseOpacity ?? 1);
    material.needsUpdate = true;
  }
  if (mesh.userData.points) {
    mesh.userData.points.visible = mode === 'point';
  }
}

function applyRenderMode(mode) {
  currentRenderMode = mode;
  renderables.forEach((mesh) => applyRenderModeToMesh(mesh, mode));
  document.querySelectorAll('#renderMode button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
}

function makeBox(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = setupMesh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  mesh.position.set(x, y, z);
  return mesh;
}

function makeCylinder(radiusTop, radiusBottom, height, radial, material, x = 0, y = 0, z = 0) {
  const mesh = setupMesh(new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial), material));
  mesh.position.set(x, y, z);
  return mesh;
}

function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(maxAnisotropy, 8);
  if (THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }
  return texture;
}

const obstacleTextures = {
  crater: makeCanvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    const outer = ctx.createRadialGradient(cx, cy, 22, cx, cy, 236);
    outer.addColorStop(0, 'rgba(7, 6, 4, 0.95)');
    outer.addColorStop(0.32, 'rgba(22, 15, 8, 0.92)');
    outer.addColorStop(0.58, 'rgba(84, 54, 28, 0.86)');
    outer.addColorStop(0.78, 'rgba(154, 104, 58, 0.55)');
    outer.addColorStop(1, 'rgba(116, 76, 39, 0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 224, 176, -0.12, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 48; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 92 + Math.random() * 130;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.72;
      ctx.fillStyle = `rgba(${80 + Math.random() * 70}, ${48 + Math.random() * 34}, ${24 + Math.random() * 20}, ${0.35 + Math.random() * 0.32})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + Math.random() * 30, 4 + Math.random() * 15, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'screen';
    const rim = ctx.createRadialGradient(cx - 28, cy - 34, 42, cx, cy, 210);
    rim.addColorStop(0, 'rgba(255, 192, 104, 0.16)');
    rim.addColorStop(0.45, 'rgba(219, 135, 65, 0.28)');
    rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 220, 170, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }),
  sandbags: makeCanvasTexture(512, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    const bag = (x, y, bw, bh, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2, bh / 2, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(54, 38, 19, 0.45)';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 234, 157, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + bw * 0.18, y + bh * 0.38);
      ctx.bezierCurveTo(x + bw * 0.36, y + bh * 0.18, x + bw * 0.72, y + bh * 0.18, x + bw * 0.84, y + bh * 0.42);
      ctx.stroke();
      ctx.shadowBlur = 18;
    };
    const colors = ['#92753f', '#b39252', '#806333', '#c0a260', '#9f7f44'];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 32 + col * 112 + (row % 2) * 50;
        const y = 146 - row * 78 + Math.sin(col) * 5;
        bag(x, y, 128, 70, colors[(row * 4 + col) % colors.length]);
      }
    }
    ctx.shadowBlur = 0;
  }),
  barrels: makeCanvasTexture(384, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const barrel = (x, y, bw, bh, angle, color) => {
      ctx.save();
      ctx.translate(x + bw / 2, y + bh / 2);
      ctx.rotate(angle);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.52)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
      const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      grad.addColorStop(0, '#151713');
      grad.addColorStop(0.18, color);
      grad.addColorStop(0.5, '#777267');
      grad.addColorStop(0.82, color);
      grad.addColorStop(1, '#141410');
      ctx.fillStyle = grad;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 9;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeStyle = 'rgba(245, 194, 93, 0.55)';
      ctx.lineWidth = 5;
      [-0.34, 0, 0.34].forEach((yy) => {
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 8, yy * bh);
        ctx.lineTo(bw / 2 - 8, yy * bh);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(120, 55, 24, 0.48)';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.ellipse(-bw / 2 + Math.random() * bw, -bh / 2 + Math.random() * bh, 5 + Math.random() * 14, 2 + Math.random() * 8, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    barrel(74, 92, 118, 300, 0.06, '#343a35');
    barrel(165, 190, 118, 260, -0.62, '#5a3320');
  })
};

const obstacleMaterials = {
  crater: new THREE.MeshBasicMaterial({ map: obstacleTextures.crater, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  sandbags: new THREE.MeshBasicMaterial({ map: obstacleTextures.sandbags, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  barrels: new THREE.MeshBasicMaterial({ map: obstacleTextures.barrels, transparent: true, depthWrite: false, side: THREE.DoubleSide })
};

const world = new THREE.Group();
scene.add(world);

const roadGroup = new THREE.Group();
world.add(roadGroup);

const roadSegments = [];
const roadLength = 46;
for (let i = 0; i < 5; i++) {
  const segment = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(11.5, roadLength, 8, 24), materials.road));
  segment.rotation.x = -Math.PI / 2;
  segment.position.z = 12 - i * roadLength;
  segment.receiveShadow = true;
  disableShadowCaster(segment);
  segment.userData.textureRole = 'road';
  segment.userData.baseX = segment.position.x;
  segment.userData.baseY = segment.position.y;
  roadGroup.add(segment);
  roadSegments.push(segment);

  for (const side of [-1, 1]) {
    const roadEdge = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(0.7, roadLength, 2, 24), materials.roadEdge));
    roadEdge.rotation.x = -Math.PI / 2;
    roadEdge.position.set(side * 5.42, 0.026, segment.position.z);
    disableShadowCaster(roadEdge, false);
    roadEdge.userData.textureRole = 'roadEdge';
    roadEdge.userData.baseX = roadEdge.position.x;
    roadEdge.userData.baseY = roadEdge.position.y;
    roadGroup.add(roadEdge);
    roadSegments.push(roadEdge);
  }

  const leftVerge = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(12, roadLength), materials.sideGround));
  leftVerge.rotation.x = -Math.PI / 2;
  leftVerge.position.set(-11.75, 0.01, segment.position.z);
  disableShadowCaster(leftVerge, false);
  leftVerge.userData.textureRole = 'verge';
  leftVerge.userData.baseX = leftVerge.position.x;
  leftVerge.userData.baseY = leftVerge.position.y;
  roadGroup.add(leftVerge);

  const rightVerge = leftVerge.clone();
  rightVerge.material = materials.sideGround;
  rightVerge.position.x = 11.75;
  rightVerge.userData.points = null;
  setupMesh(rightVerge);
  disableShadowCaster(rightVerge, false);
  rightVerge.userData.textureRole = 'verge';
  rightVerge.userData.baseX = rightVerge.position.x;
  rightVerge.userData.baseY = rightVerge.position.y;
  roadGroup.add(rightVerge);
  roadSegments.push(leftVerge, rightVerge);
}

const laneLines = new THREE.Group();
roadGroup.add(laneLines);
for (let z = -170; z <= 24; z += 8) {
  for (const x of [-2, 2]) {
    const dash = makeBox(0.08, 0.02, 3.6, new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.95 }), x, 0.035, z);
    dash.castShadow = false;
    laneLines.add(dash);
  }
}

const scenery = new THREE.Group();
scene.add(scenery);

// --- INSTANCED JUNGLE ---
const treeCount = 1000;
const trunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 2.75, 7, 2);
const crownLowerGeo = new THREE.ConeGeometry(1.95, 3.05, 9, 2);
const crownMidGeo = new THREE.ConeGeometry(1.45, 2.75, 9, 2);
const crownTipGeo = new THREE.ConeGeometry(0.96, 2.25, 8, 1);
const trunkMat = materials.bark.clone();

// Wind Sway Shader
const customUniforms = { uTime: { value: 0 } };
function makeFoliageMaterial(sourceMaterial, windStrength, cacheKey) {
  const material = sourceMaterial.clone();
  material.vertexColors = true;
  material.metalness = 0;
  material.side = THREE.DoubleSide;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = customUniforms.uTime;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uTime;
varying float vLeafHeight;`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vLeafHeight = clamp((position.y + 1.8) / 4.0, 0.0, 1.0);
      float windPhase = instanceMatrix[3][0] * 0.14 + instanceMatrix[3][2] * 0.09;
      float sway = sin(uTime * 1.35 + windPhase) * ${windStrength.toFixed(3)};
      transformed.x += sway * vLeafHeight * vLeafHeight;
      transformed.z += cos(uTime * 1.05 + windPhase) * ${(
        windStrength * 0.38
      ).toFixed(3)} * vLeafHeight;
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying float vLeafHeight;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb *= mix(0.92, 1.26, vLeafHeight);
      diffuseColor.rgb += vec3(0.055, 0.075, 0.025) * (0.35 + smoothstep(0.25, 1.0, vLeafHeight));
      `
    );
  };
  material.customProgramCacheKey = () => `foliage-${cacheKey}`;
  return material;
}

function setupTreeInstanced(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.defaultCastShadow = false;
  return mesh;
}

const trunkInstanced = setupTreeInstanced(new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount));
const crownLowerInstanced = setupTreeInstanced(new THREE.InstancedMesh(crownLowerGeo, makeFoliageMaterial(materials.jungleDeep, 0.075, 'lower'), treeCount));
const crownMidInstanced = setupTreeInstanced(new THREE.InstancedMesh(crownMidGeo, makeFoliageMaterial(materials.jungle, 0.11, 'mid'), treeCount));
const crownTipInstanced = setupTreeInstanced(new THREE.InstancedMesh(crownTipGeo, makeFoliageMaterial(materials.jungleTip, 0.145, 'tip'), treeCount));

const dummy = new THREE.Object3D();
const leafBase = new THREE.Color();
const trunkColor = new THREE.Color();

function setInstanceMatrix(mesh, index, x, y, z, sx, sy, sz, rotationY) {
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.rotation.set(0, rotationY, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

for (let i = 0; i < treeCount; i++) {
  const side = Math.random() > 0.5 ? -1 : 1;
  const laneDistance = 10.8 + Math.pow(Math.random(), 1.45) * 45;
  const x = side * laneDistance;
  const z = 44 - Math.random() * 280;
  const scale = 0.48 + Math.random() * 1.1;
  const widthJitter = 0.68 + Math.random() * 0.42;
  const heightJitter = 0.82 + Math.random() * 0.48;
  const rotation = Math.random() * Math.PI * 2;
  const lean = (Math.random() - 0.5) * 0.16;

  trunkColor.setHSL(0.075 + Math.random() * 0.035, 0.42, 0.16 + Math.random() * 0.1);
  leafBase.setHSL(0.24 + Math.random() * 0.08, 0.44 + Math.random() * 0.18, 0.42 + Math.random() * 0.16);

  setInstanceMatrix(trunkInstanced, i, x + lean, 1.35 * scale * heightJitter, z, scale * 0.78, scale * heightJitter, scale * 0.78, rotation);
  setInstanceMatrix(crownLowerInstanced, i, x, 2.35 * scale * heightJitter, z, scale * widthJitter, scale * heightJitter, scale * widthJitter, rotation);
  setInstanceMatrix(crownMidInstanced, i, x + lean * 0.45, 3.35 * scale * heightJitter, z, scale * widthJitter * 0.92, scale * heightJitter, scale * widthJitter * 0.92, rotation + 0.55);
  setInstanceMatrix(crownTipInstanced, i, x + lean * 0.65, 4.35 * scale * heightJitter, z, scale * widthJitter * 0.72, scale * heightJitter * 0.96, scale * widthJitter * 0.72, rotation + 1.05);

  trunkInstanced.setColorAt(i, trunkColor);
  crownLowerInstanced.setColorAt(i, leafBase.clone().multiplyScalar(0.92));
  crownMidInstanced.setColorAt(i, leafBase);
  crownTipInstanced.setColorAt(i, leafBase.clone().offsetHSL(0.035, 0.08, 0.09));
}

[trunkInstanced, crownLowerInstanced, crownMidInstanced, crownTipInstanced].forEach((mesh) => {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
});

// Create two chunks of instanced meshes to tile them infinitely
const chunk1 = new THREE.Group();
chunk1.add(trunkInstanced, crownLowerInstanced, crownMidInstanced, crownTipInstanced);
const chunk2 = chunk1.clone();
chunk2.position.z = -260; // Offset by the length of the spawn area

scenery.add(chunk1, chunk2);
const jungleChunks = [chunk1, chunk2];

// --- MOUNTAINS ---
const mountains = new THREE.Group();
scene.add(mountains);
for (let i = 0; i < 14; i++) {
  const mw = 12 + Math.random() * 18;
  const mh = 7 + Math.random() * 13;
  const mGeo = new THREE.ConeGeometry(mw, mh, 6);
  const mMat = materials.mountain.clone();
  mMat.color.setHex([0x4a3d2e, 0x5a4935, 0x3f382f][i % 3]);
  mMat.emissive = new THREE.Color(0x17120d);
  mMat.emissiveIntensity = 0.12;
  const mount = new THREE.Mesh(mGeo, mMat);
  const side = i % 2 === 0 ? -1 : 1;
  mount.position.set(side * (82 + Math.random() * 52), mh * 0.36, -48 - i * 22);
  mount.rotation.y = Math.random() * Math.PI * 2;
  mount.castShadow = false;
  mount.receiveShadow = false;
  mountains.add(mount);
}

const flameTexture = makeCanvasTexture(192, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.68, 6, w * 0.5, h * 0.62, w * 0.48);
  glow.addColorStop(0, 'rgba(255, 238, 98, 0.95)');
  glow.addColorStop(0.24, 'rgba(255, 125, 35, 0.78)');
  glow.addColorStop(0.62, 'rgba(164, 45, 16, 0.34)');
  glow.addColorStop(1, 'rgba(20, 10, 4, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const core = ctx.createLinearGradient(0, h * 0.16, 0, h * 0.92);
  core.addColorStop(0, 'rgba(255, 238, 118, 0)');
  core.addColorStop(0.35, 'rgba(255, 228, 90, 0.84)');
  core.addColorStop(0.72, 'rgba(255, 91, 28, 0.72)');
  core.addColorStop(1, 'rgba(50, 10, 4, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.12);
  ctx.bezierCurveTo(w * 0.3, h * 0.42, w * 0.22, h * 0.62, w * 0.36, h * 0.9);
  ctx.bezierCurveTo(w * 0.52, h * 0.78, w * 0.72, h * 0.86, w * 0.7, h * 0.58);
  ctx.bezierCurveTo(w * 0.68, h * 0.4, w * 0.58, h * 0.28, w * 0.5, h * 0.12);
  ctx.fill();
});

const emberTexture = makeCanvasTexture(96, 96, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.45);
  grad.addColorStop(0, 'rgba(255, 218, 86, 0.95)');
  grad.addColorStop(0.45, 'rgba(255, 109, 25, 0.48)');
  grad.addColorStop(1, 'rgba(95, 30, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});

function makeFireSprite(texture, color, opacity) {
  return new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: true,
    blending: THREE.AdditiveBlending
  });
}

function makeFireColumn(index) {
  const group = new THREE.Group();
  const light = new THREE.PointLight(0xff7a2a, 0.38, 8, 2.1);
  light.position.set(0, 1.4, 0);
  light.castShadow = false;
  group.add(light);

  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Sprite(makeFireSprite(flameTexture, i === 0 ? 0xffe66c : 0xff7a2a, 0.42 - i * 0.06));
    flame.position.set((i - 1) * 0.22, 1.05 + i * 0.48, (Math.random() - 0.5) * 0.18);
    flame.scale.set(1.0 + i * 0.32, 1.85 + i * 0.45, 1);
    flame.userData.baseScale = flame.scale.clone();
    flame.userData.basePosition = flame.position.clone();
    flame.userData.baseOpacity = flame.material.opacity;
    flame.userData.phase = index * 0.7 + i * 1.4;
    group.add(flame);
  }

  for (let i = 0; i < 3; i++) {
    const ember = new THREE.Sprite(makeFireSprite(emberTexture, 0xffcc55, 0.28));
    ember.position.set((Math.random() - 0.5) * 1.25, 2.0 + Math.random() * 1.45, (Math.random() - 0.5) * 0.4);
    ember.scale.setScalar(0.28 + Math.random() * 0.22);
    ember.userData.baseScale = ember.scale.clone();
    ember.userData.basePosition = ember.position.clone();
    ember.userData.baseOpacity = ember.material.opacity;
    ember.userData.phase = index + i * 0.8;
    group.add(ember);
  }

  return group;
}

// --- FIRE COLUMNS (wartime burning scenery) ---
const fireColumns = [];
for (let i = 0; i < 8; i++) {
  const fireGrp = makeFireColumn(i);
  const side = i % 2 === 0 ? -1 : 1;
  fireGrp.position.set(side * (8 + Math.random() * 12), 0, -20 - i * 30);
  scene.add(fireGrp);
  fireColumns.push(fireGrp);
}

const paddies = new THREE.Group();
scene.add(paddies);
for (let i = 0; i < 6; i++) {
  const w = 7 + Math.random() * 5;
  const h = 14 + Math.random() * 8;
  const paddyGeo = new THREE.PlaneGeometry(w, h);
  const paddy = setupMesh(new THREE.Mesh(paddyGeo, materials.sideGround));
  paddy.rotation.x = -Math.PI / 2;
  paddy.position.set((i % 2 ? 1 : -1) * (24 + Math.random() * 14), 0.018, 6 - i * 35);
  disableShadowCaster(paddy, false);
  paddies.add(paddy);
}

const cloudTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const blobs = [
    [0.30, 0.58, 0.26, 0.74],
    [0.45, 0.43, 0.34, 0.86],
    [0.62, 0.54, 0.31, 0.78],
    [0.54, 0.32, 0.24, 0.54],
    [0.73, 0.62, 0.22, 0.48],
    [0.21, 0.66, 0.18, 0.42]
  ];

  blobs.forEach(([x, y, r, a]) => {
    const grad = ctx.createRadialGradient(x * w, y * h, r * w * 0.08, x * w, y * h, r * w);
    grad.addColorStop(0, `rgba(255, 246, 220, ${a})`);
    grad.addColorStop(0.48, `rgba(220, 198, 166, ${a * 0.46})`);
    grad.addColorStop(1, 'rgba(92, 78, 62, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
    ctx.fill();
  });

  const shadow = ctx.createLinearGradient(0, h * 0.35, 0, h);
  shadow.addColorStop(0, 'rgba(255, 240, 208, 0)');
  shadow.addColorStop(1, 'rgba(74, 59, 47, 0.22)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, w, h);
});

function makeCloudMaterial(opacity, color = 0xd8c6a7) {
  return new THREE.SpriteMaterial({
    map: cloudTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: true,
    blending: THREE.NormalBlending
  });
}

function makeCloudBank(index) {
  const group = new THREE.Group();
  const side = Math.random() > 0.5 ? -1 : 1;
  const baseScale = 1.2 + Math.random() * 2.3;
  const layerCount = 7 + Math.floor(Math.random() * 6);

  group.position.set(
    side * (8 + Math.random() * 28),
    5.5 + Math.random() * 8.5,
    -28 - Math.random() * 165
  );
  group.userData.drift = (Math.random() - 0.5) * 0.18;
  group.userData.floatPhase = Math.random() * Math.PI * 2;
  group.userData.baseY = group.position.y;

  for (let i = 0; i < layerCount; i++) {
    const t = layerCount <= 1 ? 0 : i / (layerCount - 1);
    const sprite = new THREE.Sprite(makeCloudMaterial(0.18 + Math.random() * 0.22, i % 3 === 0 ? 0xc5ad8f : 0xe4d3b2));
    const width = baseScale * (2.0 + Math.random() * 2.2) * (1 - Math.abs(t - 0.5) * 0.35);
    const height = baseScale * (0.9 + Math.random() * 1.4);
    sprite.position.set(
      (Math.random() - 0.5) * baseScale * 5.8,
      (Math.random() - 0.5) * baseScale * 1.6,
      (Math.random() - 0.5) * baseScale * 2.4
    );
    sprite.scale.set(width, height, 1);
    sprite.userData.phase = index * 0.73 + i * 0.41 + Math.random() * 2;
    sprite.userData.baseScale = sprite.scale.clone();
    group.add(sprite);
  }

  return group;
}

const smokePuffs = [];
for (let i = 0; i < 20; i++) {
  const cloud = makeCloudBank(i);
  scenery.add(cloud);
  smokePuffs.push(cloud);
}

const tankBase = new THREE.Group();
tankBase.position.set(0, 0, 6.2);
scene.add(tankBase);

const tankVisibilityLight = new THREE.PointLight(0xffd89a, 0.32, 3.2, 1.9);
tankVisibilityLight.position.set(0, 3.6, 2.4);
tankVisibilityLight.castShadow = false;
tankBase.add(tankVisibilityLight);

const tankRimLight = new THREE.PointLight(0xa8c8ff, 0.2, 4.0, 2.0);
tankRimLight.position.set(0, 2.4, -2.2);
tankRimLight.castShadow = false;
tankBase.add(tankRimLight);

const tank = new THREE.Group();
tankBase.add(tank);
const tankParts = [];
const wheelPivots = [];

function addTankPart(mesh) {
  tank.add(mesh);
  tankParts.push(mesh);
  return mesh;
}

addTankPart(makeBox(2.35, 0.78, 3.25, materials.tank, 0, 0.82, 0));
addTankPart(makeBox(2.65, 0.52, 3.55, materials.tankDark, 0, 0.38, 0));
addTankPart(makeBox(1.55, 0.55, 1.45, materials.tankLight, 0, 1.38, -0.22));

const turret = makeCylinder(0.78, 0.92, 0.48, 12, materials.tankLight, 0, 1.74, -0.28);
addTankPart(turret);

const barrelPivot = new THREE.Group();
barrelPivot.position.set(0, 1.75, -0.98);
tank.add(barrelPivot);
const barrel = makeCylinder(0.11, 0.14, 2.55, 12, materials.metal, 0, 0, -1.22);
barrel.rotation.x = Math.PI / 2;
barrelPivot.add(barrel);
tankParts.push(barrel);

const hatch = makeCylinder(0.34, 0.38, 0.22, 12, materials.tankDark, 0.2, 2.07, -0.18);
addTankPart(hatch);

for (const side of [-1, 1]) {
  addTankPart(makeBox(0.38, 0.68, 3.65, materials.tankDark, side * 1.38, 0.42, 0));
  for (const z of [-1.35, -0.48, 0.42, 1.3]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.42, 0.42, z);
    tank.add(pivot);
    const wheel = makeCylinder(0.34, 0.34, 0.24, 18, materials.metal);
    wheel.rotation.z = Math.PI / 2;
    pivot.add(wheel);
    wheelPivots.push(pivot);
    tankParts.push(wheel);
  }
}

// Store original positions for reset after death
tankParts.forEach((p) => {
  p.userData._origPos = p.position.clone();
  p.userData._origRot = p.rotation.clone();
});

const selectionBases = {
  tank: tankBase,
  road: roadGroup
};

const enemyTemplate = {
  object: null,
  animations: []
};

function makePrimitiveEnemy() {
  const enemy = new THREE.Group();
  // Wartime soldier body with uniform
  const body = makeBox(0.7, 1.05, 0.42, materials.enemy, 0, 1.05, 0);
  const head = setupMesh(new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), materials.skin));
  head.position.set(0, 1.77, 0);
  // Pith helmet (non la / mu coi)
  const helmet = setupMesh(new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x3a3520, roughness: 0.95 })));
  helmet.position.set(0, 1.95, 0);
  // Belt
  const belt = makeBox(0.72, 0.1, 0.44, new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.9 }), 0, 0.9, 0);
  // Boots
  const leftLeg = makeBox(0.2, 0.85, 0.22, new THREE.MeshStandardMaterial({ color: 0x2a2a18, roughness: 0.9 }), -0.2, 0.35, 0);
  const rightLeg = makeBox(0.2, 0.85, 0.22, new THREE.MeshStandardMaterial({ color: 0x2a2a18, roughness: 0.9 }), 0.2, 0.35, 0);
  const leftArm = makeBox(0.16, 0.85, 0.18, materials.enemy, -0.52, 1.08, 0);
  const rightArm = makeBox(0.16, 0.85, 0.18, materials.enemy, 0.52, 1.08, 0);
  leftArm.rotation.z = -0.3;
  rightArm.rotation.z = 0.3;
  // Rifle
  const rifle = makeBox(0.06, 0.06, 1.4, materials.metal, 0.58, 1.15, -0.3);
  rifle.rotation.x = -0.2;
  enemy.add(body, head, helmet, belt, leftLeg, rightLeg, leftArm, rightArm, rifle);
  enemy.userData.walkParts = { leftLeg, rightLeg, leftArm, rightArm };
  return enemy;
}

const enemies = [];
const obstacles = [];
const projectiles = [];
const explosions = [];
const mixers = [];

function makeCrater() {
  const group = new THREE.Group();
  const decal = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.65), obstacleMaterials.crater.clone()));
  decal.rotation.x = -Math.PI / 2;
  decal.rotation.z = (Math.random() - 0.5) * 0.35;
  decal.position.y = 0.055;
  decal.renderOrder = 2;
  decal.receiveShadow = false;
  disableShadowCaster(decal);
  group.add(decal);
  group.userData.kind = 'crater';
  group.userData.radius = 1.35;
  return group;
}

function makeSandbagWall() {
  const group = new THREE.Group();
  const wall = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(2.65, 1.55), obstacleMaterials.sandbags.clone()));
  wall.position.set(0, 0.78, 0);
  wall.renderOrder = 3;
  wall.receiveShadow = false;
  disableShadowCaster(wall);
  group.add(wall);
  group.userData.kind = 'sandbag';
  group.userData.radius = 1.2;
  return group;
}

function makeBarrel() {
  const group = new THREE.Group();
  const barrels = setupMesh(new THREE.Mesh(new THREE.PlaneGeometry(1.85, 2.25), obstacleMaterials.barrels.clone()));
  barrels.position.set(0.15, 1.08, 0);
  barrels.renderOrder = 3;
  barrels.receiveShadow = false;
  disableShadowCaster(barrels);
  group.add(barrels);
  group.userData.kind = 'barrel';
  group.userData.radius = 1.3;
  return group;
}

function makeEnemy() {
  let enemy;
  if (enemyTemplate.object) {
    enemy = THREE.SkeletonUtils.clone(enemyTemplate.object);
    enemy.scale.multiplyScalar(0.012);
    enemy.rotation.y = Math.PI;
    enemy.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    if (enemyTemplate.animations.length) {
      const mixer = new THREE.AnimationMixer(enemy);
      mixer.clipAction(enemyTemplate.animations[0]).play();
      enemy.userData.mixer = mixer;
      mixers.push(mixer);
    }
  } else {
    enemy = makePrimitiveEnemy();
  }
  enemy.userData.radius = 0.85;
  enemy.userData.phase = Math.random() * Math.PI * 2;
  return enemy;
}

function randomLane() {
  return lanes[Math.floor(Math.random() * lanes.length)];
}

function spawnObstacle() {
  const roll = Math.random();
  const obstacle = roll < 0.4 ? makeCrater() : roll < 0.7 ? makeSandbagWall() : makeBarrel();
  obstacle.position.set(randomLane(), 0, -95 - Math.random() * 28);
  scene.add(obstacle);
  obstacles.push(obstacle);
}

function spawnEnemy() {
  const enemy = makeEnemy();
  enemy.position.set(randomLane(), 0, -105 - Math.random() * 24);
  scene.add(enemy);
  enemies.push(enemy);
}

// --- ENEMY AIRCRAFT SYSTEM ---
const aircrafts = [];
const enemyBombs = [];
const enemyBullets = [];

const projectileAssets = {
  tankShellGeometry: new THREE.CylinderGeometry(0.2, 0.2, 0.88, 16),
  bombGeometry: new THREE.SphereGeometry(0.52, 12, 8),
  enemyBulletGeometry: new THREE.CylinderGeometry(0.14, 0.14, 1.15, 10),
  dustGeometry: new THREE.SphereGeometry(1, 6, 6),
  tankShellMaterial: materials.shell.clone(),
  bombMaterial: new THREE.MeshStandardMaterial({
    color: 0x2b241d,
    emissive: 0xff5a18,
    emissiveIntensity: 0.24,
    roughness: 0.72,
    metalness: 0.42
  }),
  enemyBulletMaterial: new THREE.MeshStandardMaterial({
    color: 0xffd36a,
    emissive: 0xff7a00,
    emissiveIntensity: 1.35,
    roughness: 0.35
  })
};

function makeFastProjectile(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.defaultCastShadow = false;
  return mesh;
}

function makeAircraft() {
  const ac = new THREE.Group();
  // Fuselage
  const fuselage = makeCylinder(0.35, 0.25, 5.0, 10, materials.aircraft, 0, 0, 0);
  fuselage.rotation.x = Math.PI / 2;
  ac.add(fuselage);
  // Nose cone
  const nose = setupMesh(new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 8), materials.aircraft));
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -2.8);
  ac.add(nose);
  // Wings
  const wing = makeBox(7, 0.1, 1.4, materials.aircraft, 0, 0, 0.3);
  ac.add(wing);
  // Wing tips
  const wingTipL = makeBox(0.6, 0.3, 0.4, materials.aircraft, -3.5, 0, 0.3);
  ac.add(wingTipL);
  const wingTipR = makeBox(0.6, 0.3, 0.4, materials.aircraft, 3.5, 0, 0.3);
  ac.add(wingTipR);
  // Tail
  const tail = makeBox(2.8, 0.1, 0.8, materials.aircraft, 0, 0, 2.2);
  ac.add(tail);
  const vTail = makeBox(0.1, 1.2, 0.9, materials.aircraft, 0, 0.6, 2.2);
  ac.add(vTail);
  // Engine pods under wings
  const engL = makeCylinder(0.18, 0.15, 0.8, 8, materials.metal, -2.0, -0.25, -0.2);
  engL.rotation.x = Math.PI / 2;
  ac.add(engL);
  const engR = makeCylinder(0.18, 0.15, 0.8, 8, materials.metal, 2.0, -0.25, -0.2);
  engR.rotation.x = Math.PI / 2;
  ac.add(engR);
  // Cockpit
  const cockpit = setupMesh(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.2, metalness: 0.6 })));
  cockpit.position.set(0, 0.22, -1.5);
  ac.add(cockpit);
  // Smoke trail particles
  for (let s = 0; s < 3; s++) {
    const trail = setupMesh(new THREE.Mesh(new THREE.SphereGeometry(0.2 + s * 0.15, 6, 6), materials.smoke));
    trail.position.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2, 2.8 + s * 0.6);
    trail.castShadow = false;
    ac.add(trail);
  }
  return ac;
}

function spawnAircraft() {
  const ac = makeAircraft();
  // Fly across the road at visible height
  const startX = (Math.random() > 0.5 ? -1 : 1) * (6 + Math.random() * 12);
  ac.position.set(startX, 12 + Math.random() * 6, -100 - Math.random() * 30);
  ac.userData.speed = 20 + Math.random() * 12;
  ac.userData.bombTimer = 0.6 + Math.random() * 0.8;
  ac.userData.bulletTimer = 0.2 + Math.random() * 0.4;
  ac.userData.strafeX = -startX * 0.05; // drift toward center
  ac.rotation.y = startX > 0 ? -0.15 : 0.15;
  // Slight banking
  ac.rotation.z = startX > 0 ? 0.1 : -0.1;
  scene.add(ac);
  aircrafts.push(ac);
}

function dropBomb(aircraft) {
  playAircraftBombDropSound();
  const bomb = makeFastProjectile(projectileAssets.bombGeometry, projectileAssets.bombMaterial);
  bomb.position.copy(aircraft.position);
  bomb.scale.set(1, 1.18, 1);
  bomb.userData.velocity = new THREE.Vector3(aircraft.userData.strafeX * 0.1, -0.5, aircraft.userData.speed * 0.3);
  bomb.userData.targetLane = randomLane();
  scene.add(bomb);
  enemyBombs.push(bomb);
}

function fireEnemyBullet(aircraft) {
  const bullet = makeFastProjectile(projectileAssets.enemyBulletGeometry, projectileAssets.enemyBulletMaterial);
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(aircraft.position.x + (Math.random() - 0.5) * 2, aircraft.position.y, aircraft.position.z);
  const targetX = tankBase.position.x + (Math.random() - 0.5) * 3;
  const dir = new THREE.Vector3(targetX - bullet.position.x, -bullet.position.y, tankBase.position.z - bullet.position.z).normalize();
  bullet.userData.velocity = dir.multiplyScalar(42);
  bullet.userData.hitHalfX = 1.2;
  bullet.userData.hitHalfZ = 1.65;
  scene.add(bullet);
  enemyBullets.push(bullet);
}

function updateAircrafts(delta) {
  if (!game.running) return;
  // Spawn aircraft periodically
  game.aircraftTimer = (game.aircraftTimer || 5) - delta;
  if (game.aircraftTimer <= 0) {
    spawnAircraft();
    game.aircraftTimer = 5 + Math.random() * 4;
  }
  // Update aircraft
  for (let i = aircrafts.length - 1; i >= 0; i--) {
    const ac = aircrafts[i];
    ac.position.z += ac.userData.speed * delta;
    ac.position.x += ac.userData.strafeX * delta + Math.sin(ac.position.z * 0.04) * delta * 1.5;
    // Animate smoke trail
    ac.children.forEach((child, ci) => {
      if (ci > 8) { // trail particles
        child.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 3 + ci) * 0.3);
      }
    });
    // Randomly either drop bomb or fire bullet
    ac.userData.bombTimer -= delta;
    ac.userData.bulletTimer -= delta;
    if (ac.userData.bombTimer <= 0) {
      if (Math.random() < 0.6) {
        dropBomb(ac);
      } else {
        fireEnemyBullet(ac);
      }
      ac.userData.bombTimer = 1.2 + Math.random() * 1.5;
    }
    if (ac.userData.bulletTimer <= 0) {
      fireEnemyBullet(ac);
      ac.userData.bulletTimer = 0.5 + Math.random() * 0.8;
    }
    if (ac.position.z > 50) {
      removeFromScene(ac);
      aircrafts.splice(i, 1);
    }
  }
  // Update bombs
  for (let i = enemyBombs.length - 1; i >= 0; i--) {
    const bomb = enemyBombs[i];
    bomb.userData.velocity.y -= 15 * delta;
    bomb.position.addScaledVector(bomb.userData.velocity, delta);
    bomb.rotation.x += delta * 5;
    if (bomb.position.y <= 0.1) {
      // Create bomb crater on road
      makeExplosion(new THREE.Vector3(bomb.position.x, 0.3, bomb.position.z));
      const crater = makeCrater();
      crater.position.set(bomb.userData.targetLane, 0, bomb.position.z);
      scene.add(crater);
      obstacles.push(crater);
      removeFromScene(bomb);
      enemyBombs.splice(i, 1);
      // Damage if close
      const dx = Math.abs(bomb.position.x - tankBase.position.x);
      const dz = Math.abs(bomb.position.z - tankBase.position.z);
      if (dx < 2.25 && dz < 2.25) damage(20);
      continue;
    }
    if (bomb.position.y < -5 || bomb.position.z > 30) {
      removeFromScene(bomb);
      enemyBombs.splice(i, 1);
    }
  }
  // Update enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.position.addScaledVector(bullet.userData.velocity, delta);
    // Check hit with tank
    const dx = Math.abs(bullet.position.x - tankBase.position.x);
    const dz = Math.abs(bullet.position.z - tankBase.position.z);
    const dy = bullet.position.y;
    if (dx < (bullet.userData.hitHalfX ?? 1.2) && dz < (bullet.userData.hitHalfZ ?? 1.65) && dy < 2.5 && dy > 0) {
      damage(12);
      applyCameraShake(0.3);
      removeFromScene(bullet);
      enemyBullets.splice(i, 1);
      continue;
    }
    if (bullet.position.y < -1 || bullet.position.z > 30 || bullet.position.z < -130) {
      removeFromScene(bullet);
      enemyBullets.splice(i, 1);
    }
  }
}

function makeExplosion(position) {
  applyCameraShake(0.6);
  playExplosionSound();
  const group = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const spark = setupMesh(new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.12, 8, 6), new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xf4d36f : 0xf17b38,
      emissive: 0x9f3c05,
      emissiveIntensity: 0.8
    })));
    spark.position.copy(position);
    spark.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8);
    group.add(spark);
  }
  group.userData.life = 0.55;
  scene.add(group);
  explosions.push(group);
}

function shoot() {
  if (!game.running || game.over) return;
  applyCameraShake(0.25);
  playTankCannonSound();
  const shell = makeFastProjectile(projectileAssets.tankShellGeometry, projectileAssets.tankShellMaterial);
  shell.rotation.x = Math.PI / 2;
  shell.position.set(tankBase.position.x, 1.72, tankBase.position.z - 2.05);
  shell.userData.velocity = new THREE.Vector3(0, 0, -42);
  scene.add(shell);
  projectiles.push(shell);
}

const game = {
  running: false,
  over: false,
  lane: 1,
  laneTarget: 0,
  score: 0,
  health: 100,
  baseSpeed: 17,
  speed: 17,
  obstacleTimer: 0,
  enemyTimer: 1.2,
  invulnerable: 0,
  aircraftTimer: 5
};

const keys = new Set();

function setLane(offset) {
  if (!game.running || game.over) return;
  game.lane = THREE.MathUtils.clamp(game.lane + offset, 0, lanes.length - 1);
  game.laneTarget = lanes[game.lane];
}

function damage(amount) {
  if (game.invulnerable > 0 || game.over) return;
  game.health = Math.max(0, game.health - amount);
  game.invulnerable = 0.85;
  tankBase.rotation.z = amount > 18 ? 0.18 : -0.12;
  applyCameraShake(amount * 0.05);
  if (game.health <= 0) {
    game.over = true;
    game.running = false;
    tankDeathExplosion();
    showMessage('<span class="danger">Xe tank da bi pha huy!</span> Nhan Choi lai de tiep tuc.');
  }
  updateHud();
}

// --- TANK DEATH EXPLOSION ---
function tankDeathExplosion() {
  applyCameraShake(1.5);
  playExplosionSound();
  // Big fire explosion at tank position
  for (let wave = 0; wave < 3; wave++) {
    setTimeout(() => {
      const group = new THREE.Group();
      const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0x333333];
      for (let i = 0; i < 14; i++) {
        const size = 0.15 + Math.random() * 0.35;
        const spark = setupMesh(new THREE.Mesh(
          new THREE.SphereGeometry(size, 8, 6),
          new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: 0xff4400,
            emissiveIntensity: 1.2 - wave * 0.3
          })
        ));
        spark.position.set(
          tankBase.position.x + (Math.random() - 0.5) * 2,
          1.0 + Math.random() * 1.5,
          tankBase.position.z + (Math.random() - 0.5) * 2
        );
        spark.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          3 + Math.random() * 8,
          (Math.random() - 0.5) * 10
        );
        group.add(spark);
      }
      group.userData.life = 1.2;
      scene.add(group);
      explosions.push(group);
      if (wave > 0) applyCameraShake(0.8);
    }, wave * 200);
  }
  // Blow apart the tank visually
  tank.children.forEach((part) => {
    if (part.isMesh) {
      part.userData.deathVel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * 6
      );
      part.userData.deathSpin = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
    }
  });
  // Flash the screen (temporary light burst)
  const flash = new THREE.PointLight(0xff6600, 8, 30);
  flash.position.set(tankBase.position.x, 3, tankBase.position.z);
  scene.add(flash);
  setTimeout(() => removeFromScene(flash), 300);
}

// --- PROCEDURAL AUDIO ---
let audioCtx, masterGain;
const listener = new THREE.AudioListener();
camera.add(listener);

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
}

function playNoiseBurst(duration, filterType, frequency, volume, decay) {
  if (!audioCtx) return null;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() - 0.5) * Math.exp(-i / (audioCtx.sampleRate * decay));
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
  return source;
}

function playTankCannonSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  playNoiseBurst(0.42, 'lowpass', 420, 0.95, 0.08);

  const thump = audioCtx.createOscillator();
  const thumpGain = audioCtx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(92, now);
  thump.frequency.exponentialRampToValueAtTime(36, now + 0.22);
  thumpGain.gain.setValueAtTime(0.85, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);
  thump.connect(thumpGain);
  thumpGain.connect(masterGain);
  thump.start(now);
  thump.stop(now + 0.36);

  const crack = audioCtx.createOscillator();
  const crackGain = audioCtx.createGain();
  crack.type = 'square';
  crack.frequency.setValueAtTime(165, now);
  crack.frequency.exponentialRampToValueAtTime(72, now + 0.12);
  crackGain.gain.setValueAtTime(0.32, now);
  crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
  crack.connect(crackGain);
  crackGain.connect(masterGain);
  crack.start(now);
  crack.stop(now + 0.18);
}

function playAircraftBombDropSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const engine = audioCtx.createOscillator();
  const engineGain = audioCtx.createGain();
  const engineFilter = audioCtx.createBiquadFilter();
  engine.type = 'sawtooth';
  engine.frequency.setValueAtTime(86, now);
  engine.frequency.linearRampToValueAtTime(58, now + 1.0);
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 520;
  engineGain.gain.setValueAtTime(0.18, now);
  engineGain.gain.linearRampToValueAtTime(0.3, now + 0.2);
  engineGain.gain.exponentialRampToValueAtTime(0.01, now + 1.15);
  engine.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(masterGain);
  engine.start(now);
  engine.stop(now + 1.2);

  const whistle = audioCtx.createOscillator();
  const whistleGain = audioCtx.createGain();
  whistle.type = 'triangle';
  whistle.frequency.setValueAtTime(920, now + 0.08);
  whistle.frequency.exponentialRampToValueAtTime(260, now + 1.08);
  whistleGain.gain.setValueAtTime(0.001, now);
  whistleGain.gain.linearRampToValueAtTime(0.18, now + 0.18);
  whistleGain.gain.exponentialRampToValueAtTime(0.01, now + 1.12);
  whistle.connect(whistleGain);
  whistleGain.connect(masterGain);
  whistle.start(now + 0.05);
  whistle.stop(now + 1.15);

  playNoiseBurst(0.22, 'bandpass', 1200, 0.08, 0.08);
}

function playExplosionSound() {
  if (!audioCtx) return;
  playNoiseBurst(0.8, 'lowpass', 600, 1.0, 0.15);
}

function resetGame() {
  [...obstacles, ...enemies, ...projectiles, ...aircrafts, ...enemyBombs, ...enemyBullets].forEach(removeFromScene);
  obstacles.length = 0;
  enemies.length = 0;
  projectiles.length = 0;
  aircrafts.length = 0;
  enemyBombs.length = 0;
  enemyBullets.length = 0;
  explosions.forEach(removeFromScene);
  explosions.length = 0;
  game.running = false;
  game.over = false;
  game.lane = 1;
  game.laneTarget = 0;
  game.score = 0;
  game.health = 100;
  game.speed = game.baseSpeed;
  game.obstacleTimer = 0.3;
  game.enemyTimer = 1.4;
  game.aircraftTimer = 5;
  game.invulnerable = 0;
  tankBase.position.x = 0;
  tankBase.rotation.set(0, 0, 0);
  // Reset tank parts after death explosion
  tank.position.set(0, 0, 0);
  tank.rotation.set(0, 0, 0);
  tank.children.forEach((part) => {
    if (part.isMesh) {
      delete part.userData.deathVel;
      delete part.userData.deathSpin;
    }
  });
  // Rebuild tank geometry positions
  tankParts.forEach((p) => {
    if (p.userData._origPos) {
      p.position.copy(p.userData._origPos);
      p.rotation.copy(p.userData._origRot);
    }
  });
  updateHud();
  showMessage('Nhan <strong>Enter</strong> hoac <strong>Bat dau</strong> de vao tran. A/D doi lan, Space ban ke dich, tranh ho bom, bao cat va thung phi.');
}

function startGame() {
  if (game.over) resetGame();
  game.running = true;
  setToolsCollapsed(true);
  hideMessage();
  initAudio();
}

function pauseGame() {
  game.running = false;
  setToolsCollapsed(false);
  showMessage('Dang tam dung. Nhan <strong>Enter</strong> hoac <strong>Bat dau</strong> de chay tiep.');
}

function toggleGameRunning() {
  if (game.running) {
    pauseGame();
  } else {
    startGame();
  }
}

function stopGame() {
  resetGame();
  setToolsCollapsed(false);
  showMessage('Da dung game. Nhan <strong>Enter</strong> de bat dau lai.');
}

function showMessage(html) {
  const message = document.getElementById('message');
  message.innerHTML = html;
  message.classList.remove('hidden');
}

function hideMessage() {
  document.getElementById('message').classList.add('hidden');
}

function updateHud() {
  document.getElementById('score').textContent = Math.floor(game.score).toString();
  document.getElementById('health').textContent = Math.floor(game.health).toString();
  document.getElementById('speed').textContent = `${(game.speed / game.baseSpeed).toFixed(1)}x`;
}

// --- ROAD CURVATURE (pseudo-3D depth effect) ---
const roadCurveAmount = 0.012;
let roadCurveOffset = 0;

function updateRoad(delta) {
  const move = game.running ? game.speed * delta : 3 * delta;
  // Animate road curvature
  roadCurveOffset += delta * 0.3;
  const curveShift = Math.sin(roadCurveOffset) * 2.5;
  for (let si = 0; si < roadSegments.length; si++) {
    const segment = roadSegments[si];
    segment.position.z += move;
    if (segment.position.z > 35) segment.position.z -= roadLength * 5;
    // Apply curvature: bend road segments based on distance
    const distFromCam = segment.position.z - camera.position.z;
    const curveFactor = Math.pow(Math.max(0, -distFromCam) * roadCurveAmount, 1.6);
    if (segment.userData.textureRole === 'road' || segment.userData.textureRole === 'roadEdge' || segment.userData.textureRole === 'verge') {
      const baseX = segment.userData.baseX ?? 0;
      const baseY = segment.userData.baseY ?? 0;
      segment.position.x = baseX + curveShift * curveFactor * 0.015;
      segment.position.y = baseY - Math.abs(distFromCam) * 0.002;
    }
  }
  laneLines.children.forEach((dash) => {
    dash.position.z += move;
    if (dash.position.z > 28) dash.position.z -= 200;
  });
  jungleChunks.forEach((chunk) => {
    chunk.position.z += move * 0.72;
    if (chunk.position.z > 260) {
      chunk.position.z -= 520;
    }
  });
  smokePuffs.forEach((object) => {
    object.position.z += move * 0.72;
    if (object.position.z > 32) {
      object.position.z -= 220;
      const side = Math.random() > 0.5 ? -1 : 1;
      object.position.x = side * (9 + Math.random() * 28);
      object.position.y = 5.5 + Math.random() * 8.5;
      object.userData.baseY = object.position.y;
      object.userData.drift = (Math.random() - 0.5) * 0.18;
    }
  });
  paddies.children.forEach((object) => {
    object.position.z += move * 0.58;
    if (object.position.z > 32) object.position.z -= 218;
  });
  // Move fire columns
  fireColumns.forEach((fc) => {
    fc.position.z += move * 0.6;
    if (fc.position.z > 30) fc.position.z -= 260;
  });
}

function updateTank(delta, elapsed) {
  // Tank death animation - parts fly apart
  if (game.over) {
    tank.children.forEach((part) => {
      if (part.isMesh && part.userData.deathVel) {
        part.position.addScaledVector(part.userData.deathVel, delta);
        part.userData.deathVel.y -= 9.8 * delta;
        part.rotation.x += part.userData.deathSpin.x * delta;
        part.rotation.z += part.userData.deathSpin.z * delta;
      }
    });
    return;
  }
  tankBase.position.x = THREE.MathUtils.damp(tankBase.position.x, game.laneTarget, 9, delta);
  const wobble = game.running ? Math.sin(elapsed * 16) * 0.025 : 0;
  tank.position.y = wobble;
  tank.rotation.z = THREE.MathUtils.damp(tank.rotation.z, (game.laneTarget - tankBase.position.x) * -0.035, 8, delta);
  tankBase.rotation.z = THREE.MathUtils.damp(tankBase.rotation.z, 0, 6, delta);
  barrelPivot.rotation.x = -0.04 + Math.sin(elapsed * 3) * 0.018;
  for (const pivot of wheelPivots) {
    pivot.rotation.x -= (game.running ? game.speed : 5) * delta * 2.35;
  }

  // Dust Particles
  if (game.running && Math.random() < 0.45) {
    const dustGrp = new THREE.Group();
    const dust = makeFastProjectile(projectileAssets.dustGeometry, materials.mud);
    dust.scale.setScalar(0.25 + Math.random() * 0.2);
    dust.position.set(tankBase.position.x + (Math.random() > 0.5 ? 1.3 : -1.3), 0.2, tankBase.position.z + 1.6);
    dust.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2, 6 + Math.random() * 3);
    dustGrp.add(dust);
    dustGrp.userData.life = 0.65;
    scene.add(dustGrp);
    explosions.push(dustGrp);
  }
}

function updateSpawns(delta) {
  if (!game.running) return;
  game.obstacleTimer -= delta;
  game.enemyTimer -= delta;
  if (game.obstacleTimer <= 0) {
    spawnObstacle();
    game.obstacleTimer = Math.max(0.55, 1.35 - game.score / 2600) + Math.random() * 0.55;
  }
  if (game.enemyTimer <= 0) {
    spawnEnemy();
    game.enemyTimer = Math.max(1.1, 2.5 - game.score / 3400) + Math.random() * 1.15;
  }
}

function updateHazards(delta, elapsed) {
  const move = game.running ? game.speed * delta : 0;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.position.z += move;
    obstacle.rotation.y += delta * 0.3;
    const dz = Math.abs(obstacle.position.z - tankBase.position.z);
    const dx = Math.abs(obstacle.position.x - tankBase.position.x);
    if (dz < 1.75 && dx < obstacle.userData.radius + 0.72) {
      damage(obstacle.userData.kind === 'crater' ? 28 : 18);
      makeExplosion(new THREE.Vector3(obstacle.position.x, 0.7, obstacle.position.z));
      removeFromScene(obstacle);
      obstacles.splice(i, 1);
      continue;
    }
    if (obstacle.position.z > 20) {
      removeFromScene(obstacle);
      obstacles.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.position.z += move * 0.94;
    enemy.rotation.y = Math.PI + Math.sin(elapsed * 2 + enemy.userData.phase) * 0.08;
    if (enemy.userData.walkParts) {
      const phase = elapsed * 8 + enemy.userData.phase;
      enemy.userData.walkParts.leftLeg.rotation.x = Math.sin(phase) * 0.55;
      enemy.userData.walkParts.rightLeg.rotation.x = -Math.sin(phase) * 0.55;
      enemy.userData.walkParts.leftArm.rotation.x = -Math.sin(phase) * 0.42;
      enemy.userData.walkParts.rightArm.rotation.x = Math.sin(phase) * 0.42;
    }
    const dz = Math.abs(enemy.position.z - tankBase.position.z);
    const dx = Math.abs(enemy.position.x - tankBase.position.x);
    if (dz < 1.7 && dx < 1.35) {
      damage(24);
      makeExplosion(new THREE.Vector3(enemy.position.x, 1, enemy.position.z));
      removeFromScene(enemy);
      enemies.splice(i, 1);
      continue;
    }
    if (enemy.position.z > 22) {
      removeFromScene(enemy);
      enemies.splice(i, 1);
    }
  }
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.position.addScaledVector(projectile.userData.velocity, delta);
    projectile.rotation.y += delta * 16;
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (projectile.position.distanceTo(enemy.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.2) {
        game.score += 120;
        makeExplosion(new THREE.Vector3(enemy.position.x, 1.2, enemy.position.z));
        removeFromScene(enemy);
        enemies.splice(j, 1);
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const obstacle = obstacles[j];
        if (obstacle.userData.kind !== 'crater' && projectile.position.distanceTo(obstacle.position.clone().add(new THREE.Vector3(0, 0.6, 0))) < 1.15) {
          game.score += 45;
          makeExplosion(new THREE.Vector3(obstacle.position.x, 0.8, obstacle.position.z));
          removeFromScene(obstacle);
          obstacles.splice(j, 1);
          hit = true;
          break;
        }
      }
    }
    if (hit || projectile.position.z < -125) {
      removeFromScene(projectile);
      projectiles.splice(i, 1);
    }
  }
}

function updateExplosions(delta) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.userData.life -= delta;
    explosion.children.forEach((spark) => {
      spark.position.addScaledVector(spark.userData.velocity, delta);
      spark.userData.velocity.y -= 8 * delta;
      spark.scale.multiplyScalar(0.985);
    });
    if (explosion.userData.life <= 0) {
      removeFromScene(explosion);
      explosions.splice(i, 1);
    }
  }
}

function updateCamera() {
  camera.position.copy(cameraBasePosition);
  if (cameraShake > 0.001) {
    cameraShakeOffset.set(
      (Math.random() - 0.5) * cameraShake,
      (Math.random() - 0.5) * cameraShake * 0.55,
      0
    );
    camera.position.add(cameraShakeOffset);
    cameraShake *= 0.86;
  } else {
    cameraShake = 0;
  }
  const lookAt = new THREE.Vector3(tankBase.position.x * 0.08, 1.2, tankBase.position.z - 7);
  camera.lookAt(lookAt);
}

function updateGame(delta, elapsed) {
  if (game.running) {
    game.score += delta * game.speed * 4.8;
    game.speed = Math.min(31, game.baseSpeed + game.score / 410);
    if (game.invulnerable > 0) {
      game.invulnerable -= delta;
      tank.visible = Math.floor(elapsed * 20) % 2 === 0 || game.invulnerable <= 0;
    } else {
      tank.visible = true;
    }

  }
  updateRoad(delta);
  updateTank(delta, elapsed);
  updateSpawns(delta);
  updateHazards(delta, elapsed);
  updateProjectiles(delta);
  updateExplosions(delta);
  updateAircrafts(delta);
  customUniforms.uTime.value = elapsed;
  smokePuffs.forEach((cloud, index) => {
    cloud.position.x += (Math.sin(elapsed * 0.18 + index) * 0.08 + cloud.userData.drift) * delta;
    cloud.position.y = cloud.userData.baseY + Math.sin(elapsed * 0.22 + cloud.userData.floatPhase) * 0.28;
    cloud.rotation.z = Math.sin(elapsed * 0.12 + index) * 0.035;
    cloud.children.forEach((sprite) => {
      const pulse = 1 + Math.sin(elapsed * 0.25 + sprite.userData.phase) * 0.025;
      sprite.scale.copy(sprite.userData.baseScale).multiplyScalar(pulse);
    });
  });
  // Animate fire columns
  fireColumns.forEach((fc, fi) => {
    fc.children.forEach((part, fj) => {
      if (part.isLight) {
        part.intensity = 0.34 + Math.sin(elapsed * 5.2 + fi) * 0.08;
        return;
      }
      if (!part.userData.baseScale) return;
      const flicker = 1 + Math.sin(elapsed * 5.6 + part.userData.phase) * 0.12;
      part.scale.copy(part.userData.baseScale).multiplyScalar(flicker);
      part.position.y = part.userData.basePosition.y + Math.sin(elapsed * 2.2 + part.userData.phase) * 0.08;
      if (part.material && part.material.opacity !== undefined) {
        part.material.opacity = part.userData.baseOpacity + Math.sin(elapsed * 4.4 + part.userData.phase) * 0.05;
      }
    });
  });
  mixers.forEach((mixer) => mixer.update(delta));
  updateCamera();
  updateHud();
}

function applyAffineFromUi() {
  const target = selectionBases[document.getElementById('targetObject').value];
  if (!target) return;
  const tx = Number(document.getElementById('tx').value);
  const ty = Number(document.getElementById('ty').value);
  const tz = Number(document.getElementById('tz').value);
  const rx = THREE.MathUtils.degToRad(Number(document.getElementById('rx').value));
  const ry = THREE.MathUtils.degToRad(Number(document.getElementById('ry').value));
  const rz = THREE.MathUtils.degToRad(Number(document.getElementById('rz').value));
  const scale = Number(document.getElementById('scale').value);
  if (target === tankBase) {
    tank.position.set(tx, ty, tz);
    tank.rotation.set(rx, ry, rz);
    tank.scale.setScalar(scale);
  } else {
    roadGroup.position.set(tx, ty, tz);
    roadGroup.rotation.set(rx, ry, rz);
    roadGroup.scale.setScalar(scale);
  }
}

function resetAffineUi() {
  ['tx', 'ty', 'tz', 'rx', 'ry', 'rz'].forEach((id) => document.getElementById(id).value = 0);
  document.getElementById('scale').value = 1;
  tank.position.set(0, 0, 0);
  tank.rotation.set(0, 0, 0);
  tank.scale.setScalar(1);
  roadGroup.position.set(0, 0, 0);
  roadGroup.rotation.set(0, 0, 0);
  roadGroup.scale.setScalar(1);
}

function applyTextureToTarget(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }
  const target = document.getElementById('textureTarget').value;
  const meshes = [];
  if (target === 'tank') {
    meshes.push(...tankParts);
    texture.repeat.set(1.4, 1.4);
  } else if (target === 'road') {
    meshes.push(...roadSegments.filter((mesh) => mesh.userData.textureRole === 'road'));
    texture.repeat.set(2, 8);
  }
  meshes.forEach((mesh) => {
    if (!mesh.material || mesh.userData.points === undefined) return;
    mesh.material = mesh.material.clone();
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
    mesh.material.userData.baseOpacity = mesh.material.opacity;
    mesh.material.userData.baseTransparent = mesh.material.transparent;
    applyRenderModeToMesh(mesh, currentRenderMode);
  });
}

function updateCameraFromUi() {
  const camX = Number(document.getElementById('camX').value);
  const camY = Number(document.getElementById('camY').value);
  const camZ = Number(document.getElementById('camZ').value);
  const near = Number(document.getElementById('near').value);
  const far = Number(document.getElementById('far').value);
  cameraBasePosition.set(camX, camY, camZ);
  camera.position.copy(cameraBasePosition);
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

function configureLoadedModel(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((material) => {
          material.userData.baseOpacity = material.opacity;
          material.userData.baseTransparent = material.transparent;
        });
      }
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  root.scale.setScalar(1.85 / maxAxis);
  const center = new THREE.Vector3();
  box.getCenter(center);
  root.position.sub(center.multiplyScalar(root.scale.x));
}

function onModelLoaded(root, animations) {
  configureLoadedModel(root);
  enemyTemplate.object = root;
  enemyTemplate.animations = animations || [];
  showMessage('<span class="ok">Da nap model ke dich.</span> Nhan Bat dau hoac tiep tuc choi de thay ke dich moi.');
}

function loadModelFromFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  if (extension === 'fbx') {
    reader.onload = () => {
      const loader = new THREE.FBXLoader();
      const object = loader.parse(reader.result, '');
      onModelLoaded(object, object.animations || []);
    };
    reader.readAsArrayBuffer(file);
    return;
  }
  if (extension === 'glb' || extension === 'gltf') {
    reader.onload = () => {
      const loader = new THREE.GLTFLoader();
      loader.parse(reader.result, '', (gltf) => onModelLoaded(gltf.scene, gltf.animations), (error) => {
        showMessage(`<span class="danger">Khong doc duoc model:</span> ${error.message || error}`);
      });
    };
    reader.readAsArrayBuffer(file);
    return;
  }
  showMessage('<span class="danger">Dinh dang model chua ho tro.</span> Hay dung FBX, GLB hoac GLTF.');
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', pauseGame);
document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
  startGame();
});

const toolsToggle = document.getElementById('toolsToggle');
function setToolsCollapsed(collapsed) {
  document.body.classList.toggle('tools-collapsed', collapsed);
  toolsToggle.setAttribute('aria-pressed', String(collapsed));
  toolsToggle.setAttribute('aria-label', collapsed ? 'Hien thanh cong cu' : 'An thanh cong cu');
  toolsToggle.title = collapsed ? 'Hien thanh cong cu' : 'An thanh cong cu';
}

toolsToggle.addEventListener('click', () => {
  setToolsCollapsed(!document.body.classList.contains('tools-collapsed'));
  toolsToggle.blur();
});

document.querySelectorAll('#renderMode button').forEach((button) => {
  button.addEventListener('click', () => applyRenderMode(button.dataset.mode));
});

['camX', 'camY', 'camZ', 'near', 'far'].forEach((id) => {
  document.getElementById(id).addEventListener('input', updateCameraFromUi);
});

['targetObject', 'tx', 'ty', 'tz', 'rx', 'ry', 'rz', 'scale'].forEach((id) => {
  document.getElementById(id).addEventListener('input', applyAffineFromUi);
});

document.getElementById('resetTransform').addEventListener('click', resetAffineUi);

document.getElementById('textureInput').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const url = URL.createObjectURL(file);
  new THREE.TextureLoader().load(url, (texture) => {
    applyTextureToTarget(texture);
    URL.revokeObjectURL(url);
  });
});

document.getElementById('modelInput').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) loadModelFromFile(file);
});

document.getElementById('ambient').addEventListener('input', (event) => {
  ambientLight.intensity = Number(event.target.value);
});
document.getElementById('sun').addEventListener('input', (event) => {
  sun.intensity = Number(event.target.value);
});
document.getElementById('shadowToggle').addEventListener('change', (event) => {
  renderer.shadowMap.enabled = event.target.checked;
  scene.traverse((object) => {
    if (object.isMesh || object.isInstancedMesh) {
      object.castShadow = event.target.checked && object.userData.defaultCastShadow !== false;
    }
  });
});

function isInteractiveTarget(target) {
  return Boolean(target && target.closest && target.closest('input, select, textarea, button'));
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (!isInteractiveTarget(event.target)) {
    if (event.code === 'Enter') {
      event.preventDefault();
      toggleGameRunning();
      return;
    }
    if (event.code === 'Backspace' || event.code === 'BrowserBack' || event.key === 'Back') {
      event.preventDefault();
      stopGame();
      return;
    }
  }
  keys.add(event.code);
  if (event.code === 'KeyA') setLane(-1);
  if (event.code === 'KeyD') setLane(1);
  if (event.code === 'Space') {
    event.preventDefault();
    shoot();
  }
  if (event.code === 'KeyR') resetAffineUi();
  if (event.code === 'KeyJ') {
    document.getElementById('tx').value = Number(document.getElementById('tx').value) - 0.25;
    applyAffineFromUi();
  }
  if (event.code === 'KeyL') {
    document.getElementById('tx').value = Number(document.getElementById('tx').value) + 0.25;
    applyAffineFromUi();
  }
  if (event.code === 'KeyI') {
    document.getElementById('tz').value = Number(document.getElementById('tz').value) - 0.25;
    applyAffineFromUi();
  }
  if (event.code === 'KeyK') {
    document.getElementById('tz').value = Number(document.getElementById('tz').value) + 0.25;
    applyAffineFromUi();
  }
  if (event.code === 'KeyU') {
    document.getElementById('scale').value = Math.max(0.35, Number(document.getElementById('scale').value) - 0.05);
    applyAffineFromUi();
  }
  if (event.code === 'KeyO') {
    document.getElementById('scale').value = Math.min(2.2, Number(document.getElementById('scale').value) + 0.05);
    applyAffineFromUi();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

let cameraShake = 0;
function applyCameraShake(amount) {
  cameraShake = Math.min(cameraShake + amount, 1.5);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateGame(delta, elapsed);

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

resetGame();
updateCameraFromUi();
applyRenderMode('solid');
animate();
