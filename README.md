# 清明上河图 · 虹桥一角（2.5D）

可交互演示：三机位各锁一张批准概念静帧。河面是半透明涟漪。③ 在画里拱腹内侧贴一条随镜头视差的木肋；①② 对不齐的拱和船继续藏着。

技术栈：Vite + TypeScript + three.js + React Three Fiber + drei。

## 运行

```bash
npm install
npm run dev
```

开发服务器在 [http://127.0.0.1:43123](http://127.0.0.1:43123)。

生产构建：

```bash
npm run build
npm run preview
```

预览端口 `43124`。

## 操作

- 开场从高处飞入，底图由宽景淡入桥心；右上角可跳过，直接落到②
- 拖拽旋转、滚轮缩放。底图保持当前机位那一张，河面高光跟着水面移动
- 下方「①宽景 / ②桥心 / ③仰桥」切换机位，并交叉淡化到对应概念图
- 「对照图」在角上叠出当前静帧原图

直接打开某一机位（无开场、无界面，便于截图）：

- `/?shot=wide&clean=1`
- `/?shot=bridgeCenter&clean=1`
- `/?shot=waterUp&clean=1`

## 验收（L0 / L1 / L2）

1. **L0** 切换三个预设，背景分别是 `concept-01-wide`、`concept-02-bridge-center`、`concept-03-water`，不会三机位共用一张错透视。
2. **L1** ①② 不叠拱和船。③ 只在拱腹内侧有一条两端淡出的木肋，不挡住船和河。水面仍是贴在概念图上的半透明涟漪。
3. **L2** 底图边缘融入暖赭雾和暗角；主光是侧逆暖光。没有用 Bloom 盖画面，也没有方块铺面和胶囊人。

③ 仍是那张仰桥静帧：船和河来自底图，拱腹内侧多一条会随拖拽错开的木肋。

## 主要文件

- `src/App.tsx` — 概念底图交叉淡化、暗角、机位按钮
- `src/scene/RainbowBridgeScene.tsx` — 机位与透明清屏；拱、船、摊在验收机位不绘制
- `src/scene/ReflectiveWater.tsx` — 按机位蒙版的半透明河面涟漪与高光
- `src/scene/ContactLayer.tsx` — 仅 ③ 可见的拱腹木肋，按静帧弧线反投影
- `src/scene/cameras.ts` — 三个机位与对应底图
- `public/concepts/` — 运行时静帧
