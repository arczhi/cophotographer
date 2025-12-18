# 主题系统说明 🎨

CoPhotographer 采用可扩展的主题系统设计，支持动态添加新主题而无需修改核心逻辑。

## 当前主题

### 1. 📷 经典主题 (Classic)
- **风格**: Nikon 35Ti 复古拟物化设计
- **色调**: 深灰、金属质感
- **特点**: 
  - 金属渐变效果
  - 深色背景
  - 立体阴影
  - 怀旧相机感
- **目标用户**: 摄影爱好者、专业用户

### 2. 💖 可爱主题 (Cute)
- **风格**: 日系 CCD 相机风格
- **色调**: 粉色系 (#FFB3D9, #FF99CC, #FF66B3)
- **特点**:
  - 柔和圆角设计
  - 明亮粉色配色
  - Comic Sans 字体
  - 可爱图标和按钮
- **目标用户**: 年轻女性用户、初学者

### 3. ⚪ 极简主题 (Minimal)
- **风格**: 现代简约设计
- **色调**: 白色主调 + 蓝色点缀 (#2196F3)
- **特点**:
  - 简洁线条
  - 扁平化设计
  - 无渐变效果
  - Material Design 风格
- **目标用户**: 追求简洁的用户、移动端用户

## 主题切换方式

1. **点击切换按钮**: 快门按钮旁边的相机图标按钮
2. **自动保存**: 用户选择会保存到 localStorage
3. **下次访问**: 自动恢复上次选择的主题

## 如何添加新主题

### 1. 在 JavaScript 中注册主题 (app.js)

```javascript
const THEMES = [
    { id: 'classic', name: '经典', description: 'Nikon 35Ti复古风格' },
    { id: 'cute', name: '可爱', description: '日系CCD相机风格' },
    { id: 'minimal', name: '极简', description: '现代简约风格' },
    // 添加新主题
    { id: 'newtheme', name: '新主题', description: '新主题描述' }
];
```

### 2. 在 CSS 中定义主题样式 (style.css)

```css
/* ==================== 主题：新主题名称 ==================== */
body[data-theme="newtheme"] {
    background: #your-color;
}

body[data-theme="newtheme"] .container {
    background: #your-color;
}

/* 为所有组件添加对应样式 */
body[data-theme="newtheme"] header { ... }
body[data-theme="newtheme"] .camera-body { ... }
body[data-theme="newtheme"] .dial { ... }
/* ... 更多样式 */
```

### 3. 需要覆盖的主要组件

- `header` - 顶部标题栏
- `.camera-body` - 相机机身
- `.preview-section` - 预览区域
- `.upload-area` - 上传区域
- `.controls-section` - 控制面板
- `.dial` 及相关 - 拨盘组件
- `.scroll-selector` - 滚轮选择器
- `.shutter-button` - 快门按钮
- `.theme-toggle` - 主题切换按钮
- `.exposure-alert` - 曝光提示框
- `footer` - 底部信息

## 主题 API

### JavaScript 函数

```javascript
// 获取当前主题
const theme = getCurrentTheme();
console.log(theme); // { id: 'classic', name: '经典', description: '...' }

// 通过 ID 设置主题
setThemeById('cute'); // 切换到可爱主题

// 主题切换（循环）
switchTheme(); // 切换到下一个主题
```

### 本地存储

- **Key**: `cophotographer_theme`
- **Value**: 主题 ID (`classic` / `cute` / `minimal`)
- **用途**: 保存用户主题偏好

## 设计原则

1. **可扩展性**: 添加新主题不影响现有代码
2. **性能优化**: 使用 CSS 属性选择器，避免大量类切换
3. **用户体验**: 主题切换平滑过渡（0.5s transition）
4. **持久化**: 自动保存用户偏好
5. **移动友好**: 所有主题均适配移动端

## 建议主题方向

- 🌙 **暗黑主题**: OLED 友好的纯黑主题
- 🌈 **多彩主题**: 渐变色彩设计
- 📱 **手机主题**: 大按钮、高对比度
- 🎮 **游戏主题**: 赛博朋克风格
- 🏔️ **自然主题**: 绿色、大地色系
- 🎨 **创意主题**: 艺术家风格

## 技术细节

### CSS 选择器优先级
```css
/* 基础样式 */
.dial { ... }

/* 主题覆盖（优先级更高） */
body[data-theme="cute"] .dial { ... }
```

### 主题切换动画
```javascript
document.body.style.transition = 'background 0.5s ease';
```

### 浏览器兼容性
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ 移动端浏览器

## 反馈与贡献

如果您有新的主题创意或改进建议，欢迎提交 Issue 或 Pull Request！
