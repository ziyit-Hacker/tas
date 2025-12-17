// 管理页面JS代码


/*






菜单切换相关事件监听
主要功能:
1. 切换不同的内容区域
2. 更新系统信息
3. 渲染不同的菜单状态






*/


document.addEventListener('DOMContentLoaded', function () {
    // 菜单切换功能
    function switchSection(sectionId) {
        // 隐藏所有内容区域
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // 显示选中的内容区域
        document.getElementById(sectionId).classList.add('active');

        // 更新菜单项active状态
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    // 音乐管理菜单点击
    document.querySelector('[data-section="music-management"]').addEventListener('click', function () {
        switchSection('music-management');
        updateSystemInfo('切换到音乐管理');
    });

    // 用户管理菜单点击
    document.querySelector('[data-section="user-management"]').addEventListener('click', function () {
        // 切换到用户管理页面
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('user-management').classList.add('active');

        // 更新菜单项active状态
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');

        // 加载黑名单数据
        loadBlacklist();

        // 加载用户数据
        loadUsers();
    });

    // 添加用户按钮
    document.getElementById('add-user-btn').addEventListener('click', addUser);

    // 刷新用户列表
    document.getElementById('refresh-users').addEventListener('click', function () {
        loadUsers();
        updateSystemInfo('用户列表已刷新');
    });

    // 搜索用户
    document.getElementById('user-search').addEventListener('input', searchUsers);

    // 导出用户数据
    document.getElementById('export-users').addEventListener('click', exportUsers);

    // 模态框外部点击关闭
    document.getElementById('user-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });

    // 坤币管理菜单点击
    document.querySelector('[data-section="coin-management"]').addEventListener('click', function () {
        switchSection('coin-management');
        updateSystemInfo('切换到坤币管理');

        // 初始化坤币验钞机
        initCoinVerifier();
    });
});

// 权限检查
function checkUserPermission() {
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }
    
    const authToken = getCookie('authToken');
    
    if (!authToken) {
        alert('请先登录以访问管理员页面');
        window.location.href = './';
        return;
    }

    const [typeCode, userId] = authToken.split('-');

    // 检查是否为普通用户
    if (typeCode === 'UR') {
        alert('您没有权限访问管理员页面');
        window.location.href = './';
        return;
    }

    // 检查是否为指定的管理员用户（用户名必须为13258227085）
    if (userId !== '13258227085') {
        alert('您没有权限访问管理员页面');
        window.location.href = './';
        return;
    }

    // 显示用户角色
    const userRole = document.getElementById('user-role');
    if (typeCode === 'AD') {
        userRole.textContent = '系统管理员';
    } else if (typeCode === 'ZC') {
        userRole.textContent = 'VIP用户';
    }
}


/*






音乐管理相关事件监听
主要功能:
1. 加载音乐数据
2. 更新音乐统计信息
3. 渲染音乐表格
4. 刷新音乐数据
5. 导出音乐数据
6. 导入音乐数据






*/


let currentMusicIndex = -1;
let musicList = [];
let isPlaying = false;

const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentSong = document.getElementById('current-song');
const playerStatus = document.getElementById('player-status');
const progress = document.getElementById('progress');
const musicListElement = document.getElementById('music-list');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const lyricsContent = document.getElementById('lyrics-content');
const lyricsInfo = document.getElementById('lyrics-info');
const totalSongs = document.getElementById('total-songs');
const playingSong = document.getElementById('playing-song');

// 格式化时间为 MM:SS 格式
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
        return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 更新当前时间和总时长显示
function updateTimeDisplay() {
    currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
    totalTimeElement.textContent = formatTime(audioPlayer.duration);
}

// 加载歌词
async function loadLyrics(lyricsPath) {
    if (lyricsPath === '[NO DATA]') {
        lyricsContent.innerHTML = '暂无歌词数据';
        lyricsInfo.textContent = '无歌词';
        return;
    }

    try {
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();

        // 直接显示歌词文件中的所有内容
        lyricsContent.innerHTML = lyricsText;
        lyricsInfo.textContent = '已加载';

        // 更新系统信息
        updateSystemInfo('歌词加载成功');
    } catch (error) {
        console.error('加载歌词失败:', error);
        lyricsContent.innerHTML = '暂无歌词数据';
        lyricsInfo.textContent = '加载失败';
        updateSystemInfo('暂无歌词数据');
    }
}

// 渲染音乐列表
function renderMusicList() {
    musicListElement.innerHTML = '';
    musicList.forEach((music, index) => {
        const [name, location, lyricsPath] = music.split(' \\ ');
        const item = document.createElement('div');
        item.className = 'music-item';
        if (index === currentMusicIndex) {
            item.classList.add('playing');
        }

        item.innerHTML = `
                    <div class="music-info">
                        <div class="music-name">${name}</div>
                        <div class="music-details">${location.split('/').pop()}</div>
                    </div>
                `;

        item.addEventListener('click', () => playMusic(index));
        musicListElement.appendChild(item);
    });

    // 更新统计信息
    totalSongs.textContent = musicList.length;
}

// 播放音乐
function playMusic(index) {
    if (index < 0 || index >= musicList.length) return;

    const [name, location, lyricsPath] = musicList[index].split(' \\ ');
    audioPlayer.src = location;
    currentMusicIndex = index;
    currentSong.textContent = name;
    playingSong.textContent = name;

    // 更新列表样式
    document.querySelectorAll('.music-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });

    // 重置时间显示
    currentTimeElement.textContent = '00:00';
    totalTimeElement.textContent = '00:00';

    // 加载歌词
    loadLyrics(lyricsPath);

    audioPlayer.play();
    isPlaying = true;
    playBtn.textContent = '||';
    playerStatus.textContent = '播放中';

    updateSystemInfo(`正在播放: ${name}`);
}

// 加载音乐列表
fetch('music.txt')
    .then(response => response.text())
    .then(data => {
        musicList = data.split('\n').filter(line => line.trim() !== '');
        renderMusicList();
        updateSystemInfo('音乐列表加载完成');
    })
    .catch(error => {
        console.error('加载音乐列表失败:', error);
        updateSystemInfo('音乐列表加载失败');
    });

// 播放/暂停控制
playBtn.addEventListener('click', () => {
    if (currentMusicIndex === -1 && musicList.length > 0) {
        playMusic(0);
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        playBtn.textContent = '▶';
        playerStatus.textContent = '暂停中';
    } else {
        audioPlayer.play();
        playBtn.textContent = '||';
        playerStatus.textContent = '播放中';
    }
    isPlaying = !isPlaying;
});

// 上一首
prevBtn.addEventListener('click', () => {
    if (musicList.length === 0) return;
    let newIndex = currentMusicIndex - 1;
    if (newIndex < 0) newIndex = musicList.length - 1;
    playMusic(newIndex);
});

// 下一首
nextBtn.addEventListener('click', () => {
    if (musicList.length === 0) return;
    let newIndex = currentMusicIndex + 1;
    if (newIndex >= musicList.length) newIndex = 0;
    playMusic(newIndex);
});

// 更新进度条和时间显示
audioPlayer.addEventListener('timeupdate', () => {
    const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = progressPercent + '%';
    updateTimeDisplay();
});

// 点击进度条跳转
document.querySelector('.progress-bar').addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = audioPlayer.duration;

    if (duration) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
});

// 当音频元数据加载完成时更新总时长
audioPlayer.addEventListener('loadedmetadata', () => {
    updateTimeDisplay();
});

// 搜索功能
document.getElementById('search-button').addEventListener('click', function (e) {
    e.preventDefault();
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const musicItems = document.querySelectorAll('.music-item');

    musicItems.forEach(item => {
        const musicName = item.querySelector('.music-name').textContent.toLowerCase();
        item.style.display = musicName.includes(searchInput) ? 'flex' : 'none';
    });

    updateSystemInfo(`搜索: ${searchInput}`);
});

// 系统信息更新
function updateSystemInfo(message) {
    const lastUpdate = document.getElementById('last-update');
    const now = new Date();
    lastUpdate.textContent = now.toLocaleTimeString();

    // 更新服务器时间
    const serverTime = document.getElementById('server-time');
    serverTime.textContent = now.toLocaleString();

    // 模拟系统状态
    const memoryUsage = document.getElementById('memory-usage');
    const cpuLoad = document.getElementById('cpu-load');

    memoryUsage.textContent = Math.floor(Math.random() * 30 + 20) + '%';
    cpuLoad.textContent = Math.floor(Math.random() * 40 + 10) + '%';

    console.log(`[系统] ${message}`);
}

// 初始化系统信息
setInterval(() => {
    updateSystemInfo('系统运行正常');
}, 5000);

// 页面加载时检查权限
document.addEventListener('DOMContentLoaded', () => {
    checkUserPermission();
    updateSystemInfo('系统初始化完成');
});


/*






LRC歌词转换相关事件监听
主要功能:
1. 加载歌词
2. 转换歌词为LRC格式
3. 显示转换后的LRC内容
4. 导出LRC文件






*/


// LRC歌词转换相关事件监听
let lrcConversionActive = false;
let currentLyricsLines = [];
let currentLrcIndex = 0;
let lrcContent = '';
let timeUpdateInterval = null; // 新增：时间更新定时器

// 实时更新当前时间显示
function updateCurrentTimeDisplay() {
    if (!lrcConversionActive) return;
    
    const currentTime = audioPlayer.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 100);
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    const timeDisplay = document.getElementById('current-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }
}

// 开始LRC转换
document.getElementById('start-lrc-conversion').addEventListener('click', function () {
    // 检查是否已加载歌词
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent || lyricsContent.innerHTML.trim() === '') {
        alert('请先选择一首歌曲并加载歌词');
        return;
    }

    // 获取当前显示的歌词内容（支持编辑后的内容）
    // 修复：使用innerHTML而不是textContent/innerText，因为编辑后的内容包含HTML标签
    const lyricsText = lyricsContent.innerHTML;

    // 将HTML内容转换为纯文本，正确处理换行
    const normalizedText = lyricsText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/\r\n/g, '\n')  // 处理Windows换行符
        .replace(/\r/g, '\n')    // 处理Mac换行符
        .replace(/\n+/g, '\n')  // 合并多个连续换行符
        .replace(/<[^>]*>/g, '') // 移除所有剩余的HTML标签
        .trim();

    // 调试：显示原始内容和处理后的内容
    console.log('原始歌词内容:', lyricsText);
    console.log('处理后的歌词内容:', normalizedText);

    // 分割歌词为行
    const allLyricsLines = normalizedText.split('\n').filter(line => line.trim() !== '');

    // 调试：显示分割后的行数
    console.log('分割后的歌词行数:', allLyricsLines.length);
    console.log('分割后的歌词行:', allLyricsLines);

    if (allLyricsLines.length === 0) {
        alert('没有可转换的歌词内容');
        return;
    }

    // 过滤掉已经包含时间戳的行（使用更宽松的检测）
    const lrcTimeRegex = /\[\d{1,2}[:：]\d{1,2}(?:\.\d{1,2})?\].*/;
    const linesToProcess = allLyricsLines.filter(line => {
        const trimmedLine = line.trim();
        return !lrcTimeRegex.test(trimmedLine);
    });

    // 调试信息
    console.log('总歌词行数:', allLyricsLines.length);
    console.log('需要处理的行数:', linesToProcess.length);
    console.log('被过滤的行:', allLyricsLines.filter(line => lrcTimeRegex.test(line.trim())));

    if (linesToProcess.length === 0) {
        alert('所有歌词行都已经包含时间戳，无需转换');
        return;
    }

    lrcConversionActive = true;
    currentLrcIndex = 0;
    lrcContent = '';
    // 保存原始歌词行和需要处理的行
    window.allLyricsLines = allLyricsLines; // 保存所有歌词行
    currentLyricsLines = linesToProcess; // 只处理需要转换的行

    // 显示转换面板
    document.getElementById('lrc-conversion-panel').style.display = 'block';
    document.getElementById('current-line-index').textContent = '0';
    document.getElementById('total-lines').textContent = currentLyricsLines.length;
    document.getElementById('lrc-preview-content').value = '';
    document.getElementById('lrc-status').textContent = '转换进行中';
    document.getElementById('start-lrc-conversion').disabled = true;
    document.getElementById('download-lrc').disabled = true;

    // 新增：启动时间更新定时器
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
    timeUpdateInterval = setInterval(updateCurrentTimeDisplay, 100); // 每100ms更新一次

    updateSystemInfo(`开始LRC歌词转换，需要处理${currentLyricsLines.length}行歌词`);
});

// 下一行歌词
document.getElementById('next-line-btn').addEventListener('click', function () {
    if (!lrcConversionActive || currentLrcIndex >= currentLyricsLines.length) return;

    // 自动获取当前播放时间
    const currentTime = audioPlayer.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 100);

    const timeString = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`;
    const currentLine = currentLyricsLines[currentLrcIndex];

    // 添加到LRC内容
    lrcContent += timeString + currentLine + '\n';
    document.getElementById('lrc-preview-content').value = lrcContent;

    // 更新进度
    currentLrcIndex++;
    document.getElementById('current-line-index').textContent = currentLrcIndex;

    // 检查是否完成
    if (currentLrcIndex >= currentLyricsLines.length) {
        lrcConversionActive = false;
        document.getElementById('lrc-status').textContent = '转换完成';
        document.getElementById('download-lrc').disabled = false;
        
        // 新增：停止时间更新定时器
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        updateSystemInfo('LRC歌词转换完成');
    } else {
        updateSystemInfo(`已转换第${currentLrcIndex}行歌词，时间: ${timeString}`);
    }
});

// 重置转换
document.getElementById('reset-lrc-btn').addEventListener('click', function () {
    lrcConversionActive = false;
    currentLyricsLines = [];
    currentLrcIndex = 0;
    lrcContent = '';
    window.allLyricsLines = null;

    document.getElementById('lrc-conversion-panel').style.display = 'none';
    document.getElementById('lrc-preview-content').value = '';
    document.getElementById('current-time-display').textContent = '00:00.00';
    document.getElementById('current-line-index').textContent = '0';
    document.getElementById('lrc-status').textContent = '准备就绪';
    document.getElementById('start-lrc-conversion').disabled = false;
    document.getElementById('download-lrc').disabled = true;

    // 新增：停止时间更新定时器
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }

    updateSystemInfo('LRC转换已重置');
});

// 下载LRC文件
document.getElementById('download-lrc').addEventListener('click', function () {
    if (lrcContent.trim() === '') {
        alert('没有可下载的LRC内容');
        return;
    }

    // 获取当前显示的歌词内容（支持编辑后的内容）
    const lyricsContent = document.getElementById('lyrics-content');
    const currentLyricsText = lyricsContent.innerHTML;

    // 将HTML内容转换为纯文本，正确处理换行
    const normalizedText = currentLyricsText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/\r\n/g, '\n')  // 处理Windows换行符
        .replace(/\r/g, '\n')    // 处理Mac换行符
        .replace(/\n+/g, '\n')  // 合并多个连续换行符
        .replace(/<[^>]*>/g, '') // 移除所有剩余的HTML标签
        .trim();

    const originalLines = normalizedText.split('\n').filter(line => line.trim() !== '');

    // 分离已经包含时间戳的行和需要转换的行
    const lrcTimeRegex = /\[\d{1,2}[:：]\d{1,2}(?:\.\d{1,2})?\].*/;

    // 构建完整的LRC内容，保持原始顺序
    let finalLrcContent = '';

    if (window.allLyricsLines && window.allLyricsLines.length > 0) {
        // 如果有保存的原始歌词行，按原始顺序构建
        window.allLyricsLines.forEach(line => {
            const trimmedLine = line.trim();
            if (lrcTimeRegex.test(trimmedLine)) {
                // 已有时间戳的行直接使用
                finalLrcContent += line + '\n';
            } else {
                // 查找转换后的内容中对应的行
                const convertedLines = lrcContent.split('\n').filter(l => l.trim() !== '');
                const convertedLine = convertedLines.find(l => {
                    // 精确匹配歌词内容（不包含时间戳部分）
                    const lineContent = l.replace(/\[\d{1,2}[:：]\d{1,2}(?:\.\d{1,2})?\]/, '').trim();
                    return lineContent === trimmedLine;
                });

                if (convertedLine) {
                    finalLrcContent += convertedLine + '\n';
                } else {
                    // 如果没有找到对应的转换行，使用原始行（无时间戳）
                    finalLrcContent += line + '\n';
                }
            }
        });
    } else {
        // 如果没有保存的原始歌词行，使用当前显示的内容
        // 先添加已有时间戳的行
        const existingLrcLines = originalLines.filter(line => {
            const trimmedLine = line.trim();
            return lrcTimeRegex.test(trimmedLine);
        });

        // 再添加转换后的行（过滤掉重复内容）
        const convertedLines = lrcContent.split('\n').filter(l => l.trim() !== '');
        const newLrcLines = convertedLines.filter(convertedLine => {
            // 检查转换后的行是否已经存在于原始内容中
            const lineContent = convertedLine.replace(/\[\d{1,2}[:：]\d{1,2}(?:\.\d{1,2})?\]/, '').trim();
            return !originalLines.some(originalLine => originalLine.trim() === lineContent);
        });

        finalLrcContent = existingLrcLines.join('\n') + '\n' + newLrcLines.join('\n');
    }

    // 清理最终内容：只移除空行，保留重复歌词（因为重复可能是故意的艺术表达）
    const finalLines = finalLrcContent.split('\n')
        .filter(line => line.trim() !== ''); // 只移除空行，保留重复歌词

    finalLrcContent = finalLines.join('\n');

    const currentSongName = document.getElementById('current-song').textContent;
    const fileName = currentSongName + '.lrc';

    // 创建下载链接
    const blob = new Blob([finalLrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateSystemInfo(`已下载LRC文件: ${fileName}`);
});

// 加载歌词
async function loadLyrics(lyricsPath) {
    // 保存当前歌词路径，用于编辑保存
    window.currentLyricsPath = lyricsPath;

    if (lyricsPath === '[NO DATA]') {
        // 显示空白内容而不是"暂无歌词数据"，允许直接编辑
        lyricsContent.innerHTML = '';
        lyricsContent.classList.add('editable');
        lyricsContent.contentEditable = true;
        lyricsInfo.textContent = '无歌词 - 可编辑';

        // 自动进入编辑模式
        setTimeout(() => {
            startEditLyrics();
        }, 100);
        return;
    }

    try {
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();

        // 直接显示歌词文件中的所有内容
        lyricsContent.innerHTML = lyricsText;
        lyricsContent.classList.remove('editable');
        lyricsContent.contentEditable = false;
        lyricsInfo.textContent = '已加载';

        // 更新系统信息
        updateSystemInfo('歌词加载成功');
    } catch (error) {
        console.error('加载歌词失败:', error);
        // 显示空白内容而不是"暂无歌词数据"，允许直接编辑
        lyricsContent.innerHTML = '';
        lyricsContent.classList.add('editable');
        lyricsContent.contentEditable = true;
        lyricsInfo.textContent = '加载失败 - 可编辑';

        // 自动进入编辑模式
        setTimeout(() => {
            startEditLyrics();
        }, 100);
        updateSystemInfo('歌词文件不存在，可编辑添加歌词');
    }
}

// 歌词编辑功能
let isEditingLyrics = false;
let originalLyricsContent = '';

// 开始编辑歌词
function startEditLyrics() {
    if (isEditingLyrics) return;

    isEditingLyrics = true;
    originalLyricsContent = lyricsContent.innerHTML;

    // 启用编辑模式
    lyricsContent.classList.add('editable');
    lyricsContent.contentEditable = true;
    lyricsContent.focus();

    // 显示编辑控制按钮
    document.getElementById('lyrics-controls').style.display = 'flex';
    document.getElementById('edit-lyrics-btn').style.display = 'none';
    document.getElementById('save-lyrics-btn').style.display = 'inline-block';

    lyricsInfo.textContent = '编辑模式';
    updateSystemInfo('进入歌词编辑模式');
}

// 取消编辑
function cancelEditLyrics() {
    if (!isEditingLyrics) return;

    isEditingLyrics = false;

    // 恢复原始内容
    lyricsContent.innerHTML = originalLyricsContent;
    lyricsContent.classList.remove('editable');
    lyricsContent.contentEditable = false;

    // 隐藏编辑控制按钮
    document.getElementById('lyrics-controls').style.display = 'none';
    document.getElementById('edit-lyrics-btn').style.display = 'inline-block';
    document.getElementById('save-lyrics-btn').style.display = 'none';

    lyricsInfo.textContent = '已取消编辑';
    updateSystemInfo('取消歌词编辑');
}

// 保存歌词
async function saveLyrics() {
    if (!isEditingLyrics) return;

    const newLyricsContent = lyricsContent.innerHTML.trim();

    // 检查是否有内容
    if (!newLyricsContent) {
        alert('请输入歌词内容');
        return;
    }

    try {
        // 如果是新歌词（没有歌词文件），提示用户保存到文件
        if (window.currentLyricsPath === '[NO DATA]') {
            const songName = document.getElementById('current-song').textContent;
            const fileName = prompt('请输入歌词文件名（不含扩展名）:', songName);

            if (!fileName) {
                alert('文件名不能为空');
                return;
            }

            // 创建新的歌词文件路径
            const newLyricsPath = `Lyrics/${fileName}.txt`;

            // 这里需要实现保存到服务器的逻辑
            // 由于是前端演示，这里只显示保存成功信息
            alert(`歌词已保存到: ${newLyricsPath}`);

            // 更新歌词信息
            lyricsInfo.textContent = '已保存';
            updateSystemInfo(`歌词已保存: ${newLyricsPath}`);
        } else {
            // 更新现有歌词文件
            alert(`歌词本地已更新到: ${window.currentLyricsPath}`);
            lyricsInfo.textContent = '已更新';
            updateSystemInfo(`歌词已本地更新: ${window.currentLyricsPath}`);
        }

        // 退出编辑模式
        isEditingLyrics = false;
        lyricsContent.classList.remove('editable');
        lyricsContent.contentEditable = false;

        // 隐藏编辑控制按钮
        document.getElementById('lyrics-controls').style.display = 'none';
        document.getElementById('edit-lyrics-btn').style.display = 'inline-block';
        document.getElementById('save-lyrics-btn').style.display = 'none';

    } catch (error) {
        console.error('保存歌词失败:', error);
        alert('保存歌词失败: ' + error.message);
        updateSystemInfo('保存歌词失败');
    }
}

// 绑定编辑按钮事件
document.getElementById('edit-lyrics-btn').addEventListener('click', startEditLyrics);
document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditLyrics);
document.getElementById('confirm-save-btn').addEventListener('click', saveLyrics);
document.getElementById('save-lyrics-btn').addEventListener('click', saveLyrics);

// ESC键取消编辑
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isEditingLyrics) {
        cancelEditLyrics();
    }
});


/*






用户管理相关事件监听
主要功能:
1. 加载用户数据
2. 更新用户统计信息
3. 渲染用户表格
4. 刷新用户数据
5. 导出用户数据
6. 导入用户数据






*/


let userList = [];
let editingUserIndex = -1;

// 用户文件路径
const USER_FILE_PATH = '../user/user.txt';

// 添加用户
function addUser() {
    editingUserIndex = -1;
    document.getElementById('modal-title').textContent = '添加用户';
    document.getElementById('user-form').reset();
    document.getElementById('user-modal').classList.add('active');
}

// 删除用户
function deleteUser(index) {
    if (confirm('确定要删除这个用户吗？此操作不可恢复！')) {
        userList.splice(index, 1);
        saveUsers();
        renderUserList();
        updateUserStats();
        updateSystemInfo('用户删除成功');
    }
}

// 加载用户数据
async function loadUsers() {
    try {
        const response = await fetch(USER_FILE_PATH);
        if (!response.ok) {
            throw new Error('用户文件不存在');
        }
        const data = await response.text();
        // 修复：正确处理每一行数据，去除空行和换行符
        userList = data.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        renderUserList();
        updateUserStats();
        updateSystemInfo('用户数据加载成功');
    } catch (error) {
        console.error('加载用户数据失败:', error);
        userList = [];
        renderUserList();
        updateUserStats();
        updateSystemInfo('用户数据加载失败');
    }
}

// 保存用户数据
async function saveUsers() {
    try {
        // 这里需要实现文件保存逻辑
        // 由于浏览器安全限制，无法直接写入文件
        // 可以显示保存成功信息，实际保存需要后端支持
        updateSystemInfo('用户数据已更新（需要后端支持实际保存）');
    } catch (error) {
        console.error('保存用户数据失败:', error);
        updateSystemInfo('用户数据保存失败');
    }
}

let blacklist = [];

// 加载黑名单数据
async function loadBlacklist() {
    try {
        const response = await fetch('../hmd.txt');
        const data = await response.text();
        blacklist = data.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .map(user => {
                const parts = user.split('-');
                return parts.length >= 2 ? parts[1] : ''; // 只提取用户名
            })
            .filter(username => username !== '');
        console.log('黑名单数据加载成功:', blacklist);
        return true;
    } catch (error) {
        console.error('加载黑名单数据失败:', error);
        blacklist = [];
        return false;
    }
}

// 检查用户是否在黑名单内
function isUserInBlacklist(username) {
    return blacklist.includes(username);
}

// 渲染用户列表
function renderUserList() {
    const userListElement = document.getElementById('user-list');
    userListElement.innerHTML = '';

    // 使用for循环遍历用户数据
    for (let i = 0; i < userList.length; i++) {
        const user = userList[i];

        // 使用user.html中的方法：直接split('-')获取所有部分
        const parts = user.split('-');
        if (parts.length < 4) {
            console.warn('用户数据格式错误:', user);
            continue; // 跳过格式错误的用户数据
        }

        // 使用user.html中的方法：直接获取各部分
        const type = parts[0];        // 用户类型
        const username = parts[1];     // 用户名
        const password = parts[2];    // 密码
        const ifZTG = parts[3];       // ZTG状态

        // 修复：正确处理ZTG状态，包括可能的换行符
        const isZTG = ifZTG.trim() === 'True';
        const isBlacklisted = isUserInBlacklist(username);

        const item = document.createElement('div');
        item.className = 'user-item';

        item.innerHTML = `
        <div class="user-avatar-small">${username.charAt(0).toUpperCase()}</div>
        <div class="user-details">
            <div class="user-name">${username}</div>
            <div class="user-type ${type.toLowerCase()}">${type === 'ZC' ? 'VIP用户' : '普通用户'}</div>
        </div>
        <div class="user-status ${isZTG ? 'ztg' : ''}">${isZTG ? 'ZTG用户' : '普通用户'}</div>
        <div class="user-status ${isBlacklisted ? 'blacklisted' : 'safe'}">${isBlacklisted ? '黑名单' : '正常'}</div>
        <div class="user-actions">
            <button class="action-btn edit" onclick="editUser(${i})">编辑</button>
            <button class="action-btn delete" onclick="deleteUser(${i})">删除</button>
        </div>
        `;

        userListElement.appendChild(item);
    }
}

// 更新用户统计信息
function updateUserStats() {
    const totalUsers = userList.length;
    const vipUsers = userList.filter(user => user.startsWith('ZC-')).length;
    const normalUsers = userList.filter(user => user.startsWith('UR-')).length;
    // 修复：正确统计ZTG用户数量
    const ztgUsers = userList.filter(user => {
        const parts = user.split('-');
        return parts.length >= 4 && parts[3].trim() === 'True';
    }).length;

    // 统计黑名单用户数量
    const blacklistedUsers = userList.filter(user => {
        const parts = user.split('-');
        return parts.length >= 2 && isUserInBlacklist(parts[1]);
    }).length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('vip-users').textContent = vipUsers;
    document.getElementById('normal-users').textContent = normalUsers;
    document.getElementById('online-user-count').textContent = ztgUsers;

    // 添加黑名单用户统计显示
    const blacklistElement = document.getElementById('blacklist-users');
    if (blacklistElement) {
        blacklistElement.textContent = blacklistedUsers;
    }
}

// 编辑用户
function editUser(index) {
    editingUserIndex = index;
    const user = userList[index];
    const parts = user.split('-');
    if (parts.length < 4) {
        console.error('用户数据格式错误，无法编辑:', user);
        return;
    }

    // 使用user.html中的方法：直接获取各部分
    const type = parts[0];        // 用户类型
    const username = parts[1];    // 用户名
    const password = parts[2];    // 密码
    const ifZTG = parts[3];      // ZTG状态

    document.getElementById('modal-title').textContent = '编辑用户';
    document.getElementById('edit-username').value = username;
    document.getElementById('edit-usertype').value = type;
    document.getElementById('edit-ztg').value = ifZTG;
    document.getElementById('edit-password').value = '';
    document.getElementById('user-modal').classList.add('active');
}

// 搜索用户
function searchUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');

    userItems.forEach(item => {
        const userName = item.querySelector('.user-name').textContent.toLowerCase();
        item.style.display = userName.includes(searchTerm) ? 'grid' : 'none';
    });

    updateSystemInfo(`搜索用户: ${searchTerm}`);
}

// 导出用户数据
function exportUsers() {
    const data = userList.join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.txt';
    a.click();
    URL.revokeObjectURL(url);
    updateSystemInfo('用户数据导出成功');
}

// 用户表单提交
document.getElementById('user-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('edit-username').value.trim();
    const password = document.getElementById('edit-password').value;
    const usertype = document.getElementById('edit-usertype').value;
    const ztg = document.getElementById('edit-ztg').value;

    if (!username) {
        alert('请输入用户名');
        return;
    }

    // 检查用户名是否已存在（编辑时排除当前用户）
    const existingIndex = userList.findIndex((user, index) => {
        const [_, existingUsername] = user.split('-');
        return existingUsername === username && index !== editingUserIndex;
    });

    if (existingIndex !== -1) {
        alert('用户名已存在，请使用其他用户名');
        return;
    }

    // 构建用户数据行
    let userData = `${usertype}-${username}`;

    // 如果有新密码，使用新密码，否则保持原密码
    if (password) {
        // 这里应该对密码进行MD5BASE64加密
        // 由于浏览器限制，这里使用简单处理
        userData += `-${btoa(password)}`;
    } else if (editingUserIndex !== -1) {
        // 编辑时保留原密码
        const oldUser = userList[editingUserIndex];
        const [_, __, oldPassword] = oldUser.split('-');
        userData += `-${oldPassword}`;
    } else {
        // 新增用户必须设置密码
        alert('请设置密码');
        return;
    }

    userData += `-${ztg}`;

    if (editingUserIndex === -1) {
        // 添加新用户
        userList.push(userData);
    } else {
        // 更新现有用户
        userList[editingUserIndex] = userData;
    }

    saveUsers();
    renderUserList();
    updateUserStats();
    document.getElementById('user-modal').classList.remove('active');

    updateSystemInfo(editingUserIndex === -1 ? '用户添加成功' : '用户信息更新成功');
});

// 取消编辑
document.getElementById('cancel-edit').addEventListener('click', function () {
    document.getElementById('user-modal').classList.remove('active');
});

// 用户管理相关事件监听
document.addEventListener('DOMContentLoaded', function () {
    // 用户管理菜单点击
    document.querySelector('[data-section="user-management"]').addEventListener('click', function () {
        // 切换到用户管理页面
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('user-management').classList.add('active');

        // 加载用户数据
        loadUsers();
    });

    // 添加用户按钮
    document.getElementById('add-user-btn').addEventListener('click', addUser);

    // 刷新用户列表
    document.getElementById('refresh-users').addEventListener('click', function () {
        loadUsers();
        updateSystemInfo('用户列表已刷新');
    });

    // 搜索用户
    document.getElementById('user-search').addEventListener('input', searchUsers);

    // 导出用户数据
    document.getElementById('export-users').addEventListener('click', exportUsers);

    // 模态框外部点击关闭
    document.getElementById('user-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// 系统信息更新（补充）
function updateSystemInfo(message) {
    const lastUpdate = document.getElementById('last-update');
    const now = new Date();
    lastUpdate.textContent = now.toLocaleTimeString();

    // 更新服务器时间
    const serverTime = document.getElementById('server-time');
    serverTime.textContent = now.toLocaleString();

    // 模拟系统状态
    const memoryUsage = document.getElementById('memory-usage');
    const cpuLoad = document.getElementById('cpu-load');

    memoryUsage.textContent = Math.floor(Math.random() * 30 + 20) + '%';
    cpuLoad.textContent = Math.floor(Math.random() * 40 + 10) + '%';

    console.log(`[系统] ${message}`);
}


/* 






坤币管理相关事件监听
主要功能:
1. 加载坤币数据
2. 更新坤币统计信息
3. 渲染坤币表格
4. 刷新坤币数据
5. 导出坤币数据
6. 导入坤币数据






*/

// 声明全局坤币数据变量
let coinData = [];

// 加载坤币数据
async function loadCoinData() {
    try {
        const response = await fetch('tkun.txt');
        if (!response.ok) {
            throw new Error('坤币数据文件不存在');
        }
        const text = await response.text();
        coinData = text.trim().split('\n').map(line => {
            const [id, amount, status] = line.split(' \\ ');
            return {
                id: id.trim(),
                amount: amount.trim(),
                status: status.trim(),
                // 标准化面额显示
                displayAmount: amount.trim() === '0.1' ? '燚' : amount.trim()
            };
        });

        updateCoinStats();
        renderCoinTable();
        updateSystemInfo('坤币数据加载成功');
    } catch (error) {
        console.error('加载坤币数据失败:', error);
        updateSystemInfo('坤币数据加载失败');
    }
}

// 更新坤币统计信息
function updateCoinStats() {
    const totalCoins = coinData.length;
    const normalCoins = coinData.filter(coin => coin.status === '正常').length;
    const sampleCoins = coinData.filter(coin => coin.status === '样钞').length; // 新增：统计样钞数量
    const abnormalCoins = totalCoins - normalCoins - sampleCoins;

    document.getElementById('total-coins').textContent = totalCoins;
    document.getElementById('normal-coins').textContent = normalCoins;
    document.getElementById('abnormal-coins').textContent = abnormalCoins;
}

// 渲染坤币表格
function renderCoinTable() {
    const tableBody = document.getElementById('coin-table-body');
    tableBody.innerHTML = '';

    coinData.forEach((coin, index) => {
        const row = document.createElement('tr');
        let statusClass = '';
        if (coin.status === '正常') {
            statusClass = 'status-normal';
        } else if (coin.status === '样钞') {
            statusClass = 'status-sample'; // 新增：样钞样式
        } else {
            statusClass = 'status-abnormal';
        }

        row.innerHTML = `
                <td>${coin.id}</td>
                <td>${coin.displayAmount}</td>
                <td class="${statusClass}">${coin.status}</td>
                <td>
                    <button type="button" class="user-btn small" onclick="verifyCoinById('${coin.id}', '${coin.amount}')">验证</button>
                </td>
            `;
        tableBody.appendChild(row);
    });
}

// 根据坤币编号验证坤币
function verifyCoinById(coinId, coinAmount) {
    document.getElementById('coin-id-input').value = coinId;

    // 设置面额选择
    const amountSelect = document.getElementById('coin-amount-input');
    const customAmountInput = document.getElementById('coin-custom-amount');

    if (coinAmount === '0.1') {
        amountSelect.value = '0.1';
        customAmountInput.style.display = 'none';
    } else if (['1', '2', '10'].includes(coinAmount)) {
        amountSelect.value = coinAmount;
        customAmountInput.style.display = 'none';
    } else {
        amountSelect.value = 'custom';
        customAmountInput.value = coinAmount;
        customAmountInput.style.display = 'block';
    }

    verifyCoin();
}

// 验证坤币
function verifyCoin() {
    const coinId = document.getElementById('coin-id-input').value.trim();
    const amountSelect = document.getElementById('coin-amount-input');
    const selectedAmount = amountSelect.value;
    let inputAmount = selectedAmount;

    // 处理自定义面额
    if (selectedAmount === 'custom') {
        inputAmount = document.getElementById('coin-custom-amount').value.trim();
    }

    if (!coinId) {
        alert('请输入坤币编号');
        return;
    }

    if (!inputAmount) {
        alert('请选择或输入坤币面额');
        return;
    }

    const coin = coinData.find(c => c.id === coinId);
    const resultElement = document.getElementById('verifier-result');
    const resultStatus = document.getElementById('result-status');
    const resultId = document.getElementById('result-id');
    const resultAmount = document.getElementById('result-amount');
    const resultStatusDetail = document.getElementById('result-status-detail');
    const resultTime = document.getElementById('result-time');
    const resultVerification = document.getElementById('result-verification');

    // 清除之前的高亮效果
    resultVerification.classList.remove('warning-highlight');

    if (coin) {
        resultElement.style.display = 'block';
        resultId.textContent = coin.id;
        resultAmount.textContent = coin.displayAmount;
        resultStatusDetail.textContent = coin.status;
        resultTime.textContent = new Date().toLocaleString('zh-CN');

        // 验证编号和面额是否匹配
        const isAmountCorrect = coin.amount === inputAmount;
        const isStatusNormal = coin.status === '正常';
        const isStatusSample = coin.status === '样钞'; // 新增：检查是否为样钞

        if (isAmountCorrect && isStatusNormal) {
            resultStatus.textContent = '真币';
            resultStatus.className = 'result-status normal';
            resultVerification.textContent = '✓ 编号和面额匹配，坤币状态正常';
            resultVerification.style.color = '#27ae60';
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        } else if (isAmountCorrect && isStatusSample) {
            resultStatus.textContent = '样钞';
            resultStatus.className = 'result-status sample';
            resultVerification.textContent = '✓ 编号和面额匹配，坤币为样钞';
            resultVerification.style.color = '#9b59b6'; // 紫色表示样钞
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        } else if (!isAmountCorrect && isStatusNormal) {
            resultStatus.textContent = '可疑';
            resultStatus.className = 'result-status warning';
            resultVerification.textContent = '⚠ 编号存在但面额不匹配，请仔细检查';
            resultVerification.style.color = '#f39c12';
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        } else if (!isAmountCorrect && isStatusSample) {
            resultStatus.textContent = '样钞可疑';
            resultStatus.className = 'result-status warning';
            resultVerification.textContent = '⚠ 编号存在但面额不匹配，样钞请仔细检查';
            resultVerification.style.color = '#f39c12';
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        } else if (isAmountCorrect && !isStatusNormal && !isStatusSample) {
            resultStatus.textContent = '异常';
            resultStatus.className = 'result-status abnormal';
            resultVerification.textContent = '✗ 编号和面额匹配，但坤币状态异常';
            resultVerification.style.color = '#e74c3c';
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        } else {
            resultStatus.textContent = '假币';
            resultStatus.className = 'result-status abnormal';
            resultVerification.textContent = '✗ 编号和面额均不匹配，可能是假币';
            resultVerification.style.color = '#e74c3c';
            // 添加高亮效果
            resultVerification.classList.add('warning-highlight');
        }

        updateSystemInfo(`坤币 ${coin.id} 验证完成`);
    } else {
        resultElement.style.display = 'block';
        resultId.textContent = coinId;
        resultAmount.textContent = inputAmount === '0.1' ? '1燚' : inputAmount;
        resultStatusDetail.textContent = '未找到';
        resultTime.textContent = new Date().toLocaleString('zh-CN');
        resultStatus.textContent = '无效';
        resultStatus.className = 'result-status abnormal';
        resultVerification.textContent = '✗ 坤币编号不存在，可能是假币';
        resultVerification.style.color = '#e74c3c';

        updateSystemInfo(`坤币 ${coinId} 未找到`);
    }
}

// 清空输入
function clearInput() {
    document.getElementById('coin-id-input').value = '';
    document.getElementById('coin-amount-input').value = '';
    document.getElementById('coin-custom-amount').value = '';
    document.getElementById('coin-custom-amount').style.display = 'none';
    document.getElementById('verifier-result').style.display = 'none';
}

// 刷新坤币列表
function refreshCoinList() {
    loadCoinData();
    clearInput();
    updateSystemInfo('坤币列表已刷新');
}

// 初始化坤币验钞机
function initCoinVerifier() {
    // 绑定事件监听器
    document.getElementById('verify-coin-btn').addEventListener('click', verifyCoin);
    document.getElementById('refresh-coins-btn').addEventListener('click', refreshCoinList);
    document.getElementById('clear-input-btn').addEventListener('click', clearInput);

    // 输入框回车键支持
    document.getElementById('coin-id-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            verifyCoin();
        }
    });

    // 面额选择变化处理
    document.getElementById('coin-amount-input').addEventListener('change', function () {
        const customAmountInput = document.getElementById('coin-custom-amount');
        if (this.value === 'custom') {
            customAmountInput.style.display = 'block';
        } else {
            customAmountInput.style.display = 'none';
            customAmountInput.value = '';
        }
    });

    // 加载坤币数据
    loadCoinData();
}
