# Tank Runner 3D - Computer Graphics Project

Project do hoa may tinh bang Three.js: game xe tang 3D chay vo han tren duong Truong Son, co dieu khien camera, affine transform, texture, anh sang, bong do, model loader va nhieu che do hien thi.

## Cach chay

Nen chay bang local server de texture va model duoc nap dung:

```bash
python -m http.server 5500
```

Sau do mo:

```text
http://localhost:5500
```

Neu muon dung npm tren PowerShell Windows:

```bash
npm.cmd run dev
```

Neu dung VS Code, co the mo thu muc project va chay bang Live Server.

## Cau truc project

```text
.
|-- index.html              # Markup va cac script/link chinh
|-- src/
|   |-- css/
|   |   `-- styles.css      # Giao dien HUD va control panel
|   `-- js/
|       `-- app.js          # Logic Three.js, game loop, vat the 3D
|-- assets/
|   `-- textures/           # Texture bitmap va SVG dung trong scene
|-- vendor/
|   `-- three/              # Three.js va loaders chay cuc bo
|-- docs/                   # Tai lieu ly thuyet/bo sung
`-- DHMT.docx               # Tai lieu do an goc
```

## Chuc nang do hoa may tinh

- Dung Three.js tao scene 3D, camera phoi canh, WebGL renderer.
- Mo hinh xe tank duoc ghep bang primitive geometry: box, cylinder, sphere, cone.
- Vat lieu PBR co roughness, metalness, normal map, texture repeat va anisotropy.
- Anh sang gom ambient, hemisphere, directional light, shadow map va point light.
- Co dieu khien affine transform: tinh tien, quay, scale cho xe tank hoac mat duong.
- Ho tro 3 che do hien thi: point, line, solid.
- Game loop co animation banh xe, dan, no, khoi, may bay va spawn vat can.
- Ho tro nap texture bitmap va model FBX/GLB/GLTF tu file nguoi dung.

## Dieu khien

- `A` / `D`: doi lan trai/phai.
- `Space`: ban dan.
- Nut UI: bat dau, tam dung, choi lai, doi camera, doi anh sang, reset affine.

## Ghi chu

Thu muc `vendor/three` da co san Three.js, loaders, shaders va post-processing can thiet, nen project co the chay cuc bo qua local server ma khong can CDN.
