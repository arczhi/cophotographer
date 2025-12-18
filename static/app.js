/**
 * CoPhotographer - 前端JavaScript逻辑
 * 客户端图像处理和相机参数控制
 */

// 摄影参数配置
const APERTURE_VALUES = [1.8, 2.0, 2.8, 4, 5.6, 8, 11, 14, 16, 18, 22];
const SHUTTER_VALUES = ['1/4', '1/8', '1/15', '1/30', '1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000', '1/3000', '1/4000', '1/8000'];
const ISO_VALUES = [200, 400, 800, 1600, 3200, 6400];

// 当前参数状态
let currentParams = {
    aperture: 5.6,
    shutter: '1/125',
    iso: 400
};

// API配置
let hasDeepSeekKey = false;

// 图像相关
let originalImage = null;
let canvas, ctx;

// DOM元素
let photoUpload, uploadArea, previewCanvas, shutterButton;
let apertureValue, shutterValue, isoValue;
let exposureAlert, alertClose, exposureSuggestion;
let themeToggle, themeName;

// 主题系统 - 可扩展设计
const THEMES = [
    { id: 'classic', name: '经典', description: 'Nikon 35Ti复古风格' },
    { id: 'cute', name: '粉色', description: '日系CCD相机风格' },
    { id: 'minimal', name: '极简', description: '现代简约风格' }
];
let currentThemeIndex = 0;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    initEventListeners();
    updateApertureDisplay();
    updateShutterDisplay();
    updateISODisplay();
    // 检查API配置（必须先完成，后续功能依赖此标记）
    await checkApiConfig();
    // 初始化主题
    initTheme();
});

/**
 * 检查后端API配置
 */
async function checkApiConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        hasDeepSeekKey = config.has_deepseek_key;
        console.log('DeepSeek API Key configured:', hasDeepSeekKey);
    } catch (error) {
        console.warn('Failed to check API config:', error);
        hasDeepSeekKey = false;
    }
}

function initElements() {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    photoUpload = document.getElementById('photoUpload');
    uploadArea = document.getElementById('uploadArea');
    previewCanvas = document.getElementById('previewCanvas');
    
    // 确保previewCanvas有2d context
    if (!previewCanvas.getContext) {
        console.error('Canvas not supported');
    }
    shutterButton = document.getElementById('shutterButton');
    
    apertureValue = document.getElementById('apertureValue');
    shutterValue = document.getElementById('shutterValue');
    isoValue = document.getElementById('isoValue');
    
    exposureAlert = document.getElementById('exposureAlert');
    alertClose = document.getElementById('alertClose');
    exposureSuggestion = document.getElementById('exposureSuggestion');
    
    themeToggle = document.getElementById('themeToggle');
    themeName = document.getElementById('themeName');
    
    // 初始化滚轮选择器
    initScrollSelectors();
}

function initScrollSelectors() {
    // 初始化光圈选择器
    const apertureScrollList = document.querySelector('[data-param="aperture"] .scroll-list');
    APERTURE_VALUES.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'scroll-item' + (value === currentParams.aperture ? ' active' : '');
        item.textContent = `f/${value}`;
        item.dataset.index = index;
        item.addEventListener('click', () => selectApertureByIndex(index));
        apertureScrollList.appendChild(item);
    });
    setupScrollListener(apertureScrollList, 'aperture', APERTURE_VALUES);
    scrollToCenter(apertureScrollList, APERTURE_VALUES.indexOf(currentParams.aperture));
    
    // 初始化快门选择器
    const shutterScrollList = document.querySelector('[data-param="shutter"] .scroll-list');
    SHUTTER_VALUES.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'scroll-item' + (value === currentParams.shutter ? ' active' : '');
        item.textContent = value;
        item.dataset.index = index;
        item.addEventListener('click', () => selectShutterByIndex(index));
        shutterScrollList.appendChild(item);
    });
    setupScrollListener(shutterScrollList, 'shutter', SHUTTER_VALUES);
    scrollToCenter(shutterScrollList, SHUTTER_VALUES.indexOf(currentParams.shutter));
    
    // 初始化ISO选择器
    const isoScrollList = document.querySelector('[data-param="iso"] .scroll-list');
    ISO_VALUES.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'scroll-item' + (value === currentParams.iso ? ' active' : '');
        item.textContent = `ISO ${value}`;
        item.dataset.index = index;
        item.addEventListener('click', () => selectISOByIndex(index));
        isoScrollList.appendChild(item);
    });
    setupScrollListener(isoScrollList, 'iso', ISO_VALUES);
    scrollToCenter(isoScrollList, ISO_VALUES.indexOf(currentParams.iso));
}

function setupScrollListener(scrollList, paramType, values) {
    let scrollTimeout;
    
    scrollList.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
            // 找到最接近中心的item
            const items = scrollList.querySelectorAll('.scroll-item');
            const scrollListRect = scrollList.getBoundingClientRect();
            const centerY = scrollListRect.height / 2;
            
            let closestItem = items[0];
            let closestDistance = Math.abs(closestItem.offsetTop + closestItem.offsetHeight / 2 - scrollList.scrollTop - centerY);
            
            items.forEach((item, index) => {
                const itemCenterY = item.offsetTop + item.offsetHeight / 2 - scrollList.scrollTop;
                const distance = Math.abs(itemCenterY - centerY);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            });
            
            // 更新active状态
            items.forEach(item => item.classList.remove('active'));
            closestItem.classList.add('active');
            
            // 更新参数
            const index = parseInt(closestItem.dataset.index);
            updateParameter(paramType, values[index]);
            
            // 滚动到中心
            scrollToCenter(scrollList, index);
        }, 150);
    });
    
    // 支持鼠标滚轮
    scrollList.addEventListener('wheel', (e) => {
        e.preventDefault();
        scrollList.scrollTop += e.deltaY;
    });
}

function scrollToCenter(scrollList, itemIndex) {
    const items = scrollList.querySelectorAll('.scroll-item');
    const targetItem = items[itemIndex];
    if (targetItem) {
        const scrollListHeight = scrollList.offsetHeight;
        const itemHeight = targetItem.offsetHeight;
        const targetScrollTop = targetItem.offsetTop - (scrollListHeight - itemHeight) / 2;
        scrollList.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }
}

function selectApertureByIndex(index) {
    currentParams.aperture = APERTURE_VALUES[index];
    updateApertureDisplay();
    processImage();
}

function selectShutterByIndex(index) {
    currentParams.shutter = SHUTTER_VALUES[index];
    updateShutterDisplay();
    processImage();
}

function selectISOByIndex(index) {
    currentParams.iso = ISO_VALUES[index];
    updateISODisplay();
    processImage();
}

function updateParameter(paramType, value) {
    switch(paramType) {
        case 'aperture':
            currentParams.aperture = value;
            updateApertureDisplay();
            break;
        case 'shutter':
            currentParams.shutter = value;
            updateShutterDisplay();
            break;
        case 'iso':
            currentParams.iso = value;
            updateISODisplay();
            break;
    }
    processImage();
}

function updateApertureDisplay() {
    apertureValue.textContent = `f/${currentParams.aperture}`;
}

function updateShutterDisplay() {
    shutterValue.textContent = currentParams.shutter;
}

function updateISODisplay() {
    isoValue.textContent = `ISO ${currentParams.iso}`;
}

function initEventListeners() {
    // 照片上传
    uploadArea.addEventListener('click', () => photoUpload.click());
    photoUpload.addEventListener('change', handlePhotoUpload);
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#555';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#555';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    });
    
    // 快门按钮（下载）
    shutterButton.addEventListener('click', downloadPhoto);
    
    // 主题切换
    themeToggle.addEventListener('click', switchTheme);
    
    // 关闭提示
    alertClose.addEventListener('click', () => {
        exposureAlert.style.display = 'none';
    });
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            console.log('Image loaded:', img.width, 'x', img.height);
            originalImage = img;
            // 隐藏上传区域，显示预览canvas
            uploadArea.style.display = 'none';
            // 移除内联display样式，使用CSS控制
            previewCanvas.removeAttribute('style');
            shutterButton.disabled = false;
            // 立即处理图像
            processImage();
        };
        img.onerror = (err) => {
            console.error('Image load error:', err);
            alert('图片加载失败，请尝试其他图片');
        };
        img.src = e.target.result;
    };
    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        alert('文件读取失败');
    };
    reader.readAsDataURL(file);
}


/**
 * 图像处理核心函数
 * 根据光圈、快门、ISO模拟曝光效果
 */
function processImage() {
    if (!originalImage) {
        console.error('No image loaded');
        return;
    }
    
    console.log('Processing image...');
    
    // 设置canvas尺寸，保持原始比例
    const maxWidth = 800;
    const maxHeight = 500;  // 预览区域限制
    
    // 计算缩放比例，同时保持原始宽高比
    const widthScale = maxWidth / originalImage.width;
    const heightScale = maxHeight / originalImage.height;
    const scale = Math.min(widthScale, heightScale, 1);  // 不放大，只缩小
    
    const targetWidth = Math.floor(originalImage.width * scale);
    const targetHeight = Math.floor(originalImage.height * scale);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    previewCanvas.width = targetWidth;
    previewCanvas.height = targetHeight;
    
    // 绘制原始图像到工作canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 计算曝光因子
    const exposureFactor = calculateExposureFactor();
    console.log('Exposure factor:', exposureFactor);
    
    // 计算景深效果（光圈影响）
    const blurAmount = calculateBlurAmount();
    
    // 应用曝光调整
    for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * exposureFactor);     // R
        data[i + 1] = clamp(data[i + 1] * exposureFactor); // G
        data[i + 2] = clamp(data[i + 2] * exposureFactor); // B
        // Alpha通道保持不变
    }
    
    // 应用ISO噪点
    applyNoise(data, currentParams.iso);
    
    // 将处理后的数据放回canvas
    ctx.putImageData(imageData, 0, 0);
    
    // 应用模糊效果（景深）- 直接在canvas上应用filter
    if (blurAmount > 0) {
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx.filter = `blur(${blurAmount}px)`;
        previewCtx.drawImage(canvas, 0, 0);
        previewCtx.filter = 'none';
    } else {
        // 直接复制到预览canvas
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx.drawImage(canvas, 0, 0);
    }
    
    console.log('Image processed successfully');
    
    // 检查曝光并提供建议
    checkExposure(imageData.data);
}

/**
 * 计算曝光因子
 * 综合考虑光圈、快门、ISO
 */
function calculateExposureFactor() {
    // 基准：f/5.6, 1/125秒, ISO 400
    const baseAperture = 5.6;
    const baseShutterValue = 125;  // 这表示 1/125 秒
    const baseISO = 400;
    
    // 光圈影响（f值越小，进光越多）
    // f/5.6 作为基准，其他f值与它的进光量比例
    const apertureFactor = Math.pow(baseAperture / currentParams.aperture, 2);
    
    // 快门影响（分母越小，曝光时间越长，进光越多）
    // 例如 1/30 > 1/125，所以 30 作为基准时，125 的因子 < 1
    const shutterFraction = parseShutterFraction(currentParams.shutter);
    const shutterFactor = baseShutterValue / shutterFraction;  // 比值互换！
    
    // ISO影响（ISO越高，感光度越高）
    const isoFactor = currentParams.iso / baseISO;
    
    return apertureFactor * shutterFactor * isoFactor;
}

/**
 * 解析快门速度分母
 * 例如 "1/125" -> 125, "1/30" -> 30
 */
function parseShutterFraction(shutter) {
    const parts = shutter.split('/');
    if (parts.length === 2) {
        return parseFloat(parts[1]);  // 返回分母
    }
    return 1;  // 如果是整数秒，返回1
}

/**
 * 计算模糊量（光圈越大，景深越浅，背景越模糊）
 */
function calculateBlurAmount() {
    // f/1.8最模糊，f/22几乎不模糊
    const maxBlur = 3;
    const minAperture = 1.8;
    const maxAperture = 22;
    
    const normalized = (maxAperture - currentParams.aperture) / (maxAperture - minAperture);
    return Math.floor(normalized * maxBlur);
}

/**
 * 应用ISO噪点
 */
function applyNoise(data, iso) {
    // ISO越高，噪点越明显
    const noiseLevel = (iso - 200) / 6400 * 20; // 0-20范围
    
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < noiseLevel / 100) {
            const noise = (Math.random() - 0.5) * noiseLevel;
            data[i] = clamp(data[i] + noise);
            data[i + 1] = clamp(data[i + 1] + noise);
            data[i + 2] = clamp(data[i + 2] + noise);
        }
    }
}


/**
 * 限制像素值在0-255范围内
 */
function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * 检查曝光并调用AI建议
 * 使用更精细的曝光判断：直方图分析
 */
async function checkExposure(data) {
    // 计算亮度直方图
    const histogram = new Array(256).fill(0);
    let totalBrightness = 0;
    let darkPixels = 0;  // 暗部像素（0-50）
    let brightPixels = 0;  // 亮部像素（205-255）
    
    for (let i = 0; i < data.length; i += 4) {
        // 使用感知亮度公式
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const level = Math.floor(brightness);
        histogram[level]++;
        totalBrightness += brightness;
        
        if (level <= 50) darkPixels++;
        if (level >= 205) brightPixels++;
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    const totalPixels = data.length / 4;
    const darkRatio = darkPixels / totalPixels;
    const brightRatio = brightPixels / totalPixels;
    
    // 改进的曝光判断逻辑
    let exposureStatus = 'ok';
    let reason = '';
    
    // 过曝判断：平均亮度高 或 高亮像素比例高
    if (avgBrightness > 200 || brightRatio > 0.2) {
        exposureStatus = 'overexposed';
        reason = `平均亮度${Math.round(avgBrightness)}，高亮像素占${(brightRatio * 100).toFixed(1)}%`;
    }
    // 欠曝判断：平均亮度低 或 暗部像素比例高
    else if (avgBrightness < 80 || darkRatio > 0.3) {
        exposureStatus = 'underexposed';
        reason = `平均亮度${Math.round(avgBrightness)}，暗部像素占${(darkRatio * 100).toFixed(1)}%`;
    }
    // 相对过曝：中等偏亮但高亮比例明显
    else if (avgBrightness > 180 && brightRatio > 0.1) {
        exposureStatus = 'slightly_overexposed';
        reason = `亮度偏高`;
    }
    // 相对欠曝：中等偏暗但暗部比例明显
    else if (avgBrightness < 100 && darkRatio > 0.2) {
        exposureStatus = 'slightly_underexposed';
        reason = `亮度偏低`;
    }
    
    // 只有明显过曝或欠曝时才请求AI建议
    if (exposureStatus !== 'ok') {
        await fetchExposureSuggestion({
            brightness: avgBrightness,
            status: exposureStatus,
            reason: reason
        });
    }
}

/**
 * 获取AI曝光建议 - 改进版本
 */
async function fetchExposureSuggestion(exposureInfo) {
    // 如果没有配置API key，不调用后端接口
    if (!hasDeepSeekKey) {
        console.log('DeepSeek API not configured, skipping exposure check');
        return;
    }
    
    try {
        const response = await fetch('/api/check-exposure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                aperture: currentParams.aperture,
                shutter: currentParams.shutter,
                iso: currentParams.iso,
                brightness: exposureInfo.brightness,
                status: exposureInfo.status,
                // 传递可选参数列表
                aperture_options: APERTURE_VALUES,
                shutter_options: SHUTTER_VALUES,
                iso_options: ISO_VALUES
            })
        });
        
        const result = await response.json();
        
        // 处理限流响应
        if (result.status === 'rate_limit') {
            showExposureAlert(result.message);
            return;
        }
        
        // 只在有具体建议内容时才显示弹窗
        if (result.suggestion && result.suggestion.trim()) {
            showExposureAlert(result.suggestion);
        } else if (result.status !== 'ok') {
            // 静默记录，不弹窗
            console.log('曝光检测:', result.message);
        }
    } catch (error) {
        console.error('获取AI建议失败:', error);
    }
}

/**
 * 显示曝光提示
 */
function showExposureAlert(suggestion) {
    exposureSuggestion.textContent = suggestion;
    exposureAlert.style.display = 'block';
    // 移除自动关闭，用户手动点击关闭按钮
}

/**
 * 下载照片
 */
function downloadPhoto() {
    if (!originalImage) return;
    
    const link = document.createElement('a');
    link.download = `cophotographer_${Date.now()}.png`;
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
}

/**
 * ==================== 主题系统 ====================
 * 可扩展的主题管理系统，支持动态添加新主题
 */

/**
 * 初始化主题 - 从localStorage恢复上次选择
 */
function initTheme() {
    const savedThemeId = localStorage.getItem('cophotographer_theme');
    if (savedThemeId) {
        const themeIndex = THEMES.findIndex(t => t.id === savedThemeId);
        if (themeIndex !== -1) {
            currentThemeIndex = themeIndex;
        }
    }
    applyTheme(THEMES[currentThemeIndex]);
}

/**
 * 切换到下一个主题
 */
function switchTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    const newTheme = THEMES[currentThemeIndex];
    
    // 添加切换动画
    document.body.style.transition = 'background 0.5s ease';
    
    applyTheme(newTheme);
    
    // 保存用户偏好
    localStorage.setItem('cophotographer_theme', newTheme.id);
    
    console.log(`主题切换到: ${newTheme.name} (${newTheme.description})`);
}

/**
 * 应用主题
 * @param {Object} theme - 主题对象 {id, name, description}
 */
function applyTheme(theme) {
    // 移除所有主题类
    document.body.removeAttribute('data-theme');
    
    // 应用新主题（classic主题不需要data-theme属性）
    if (theme.id !== 'classic') {
        document.body.setAttribute('data-theme', theme.id);
    }
    
    // 更新主题按钮显示
    themeName.textContent = theme.name;
    themeToggle.title = `当前: ${theme.name} - ${theme.description}`;
}

/**
 * 获取当前主题
 * @returns {Object} 当前主题对象
 */
function getCurrentTheme() {
    return THEMES[currentThemeIndex];
}

/**
 * 根据ID设置主题（供外部调用）
 * @param {string} themeId - 主题ID
 */
function setThemeById(themeId) {
    const themeIndex = THEMES.findIndex(t => t.id === themeId);
    if (themeIndex !== -1) {
        currentThemeIndex = themeIndex;
        applyTheme(THEMES[currentThemeIndex]);
        localStorage.setItem('cophotographer_theme', themeId);
        return true;
    }
    return false;
}

