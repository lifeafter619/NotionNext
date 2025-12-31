import { useState, useEffect } from 'react'
import Card from './Card'

/**
 * 访客信息卡片
 * 显示用户本地时间、IP属地、阅读时间和今日访客数
 * @returns
 */
export default function VisitorInfoCard() {
  const [currentTime, setCurrentTime] = useState('')
  const [greeting, setGreeting] = useState('')
  const [location, setLocation] = useState('加载中...')
  const [readingTime, setReadingTime] = useState(0)
  const [todayVisitors, setTodayVisitors] = useState('-')
  const [startTime] = useState(Date.now())

  // 更新当前时间和问候语
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      
      // 格式化时间
      const formattedHours = hours.toString().padStart(2, '0')
      const formattedMinutes = minutes.toString().padStart(2, '0')
      setCurrentTime(`${formattedHours}时${formattedMinutes}分`)
      
      // 根据时间设置问候语
      if (hours >= 5 && hours < 12) {
        setGreeting('早上好~')
      } else if (hours >= 12 && hours < 14) {
        setGreeting('中午好~')
      } else if (hours >= 14 && hours < 18) {
        setGreeting('下午好~')
      } else if (hours >= 18 && hours < 22) {
        setGreeting('晚上好~')
      } else {
        setGreeting('夜深了~')
      }
    }

    updateTimeAndGreeting()
    const timer = setInterval(updateTimeAndGreeting, 1000)
    return () => clearInterval(timer)
  }, [])

  // 更新阅读时间
  useEffect(() => {
    const updateReadingTime = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000) // 转换为分钟
      setReadingTime(elapsed)
    }

    updateReadingTime()
    const timer = setInterval(updateReadingTime, 60000) // 每分钟更新
    return () => clearInterval(timer)
  }, [startTime])

  // 获取用户IP属地
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // 尝试使用免费的IP定位API
        const response = await fetch('https://api.ipify.org?format=json')
        const ipData = await response.json()
        
        // 使用ip-api获取地理位置
        const geoResponse = await fetch(`https://ip-api.com/json/${ipData.ip}?lang=zh-CN`)
        const geoData = await geoResponse.json()
        
        if (geoData.status === 'success') {
          // 优先显示城市，其次是地区
          const city = geoData.city || geoData.regionName || geoData.country
          setLocation(city)
        } else {
          setLocation('未知地区')
        }
      } catch (error) {
        console.warn('获取IP位置失败:', error)
        // 尝试备用方案
        try {
          const response = await fetch('https://ipapi.co/json/')
          const data = await response.json()
          const city = data.city || data.region || data.country_name || '未知地区'
          setLocation(city)
        } catch (err) {
          setLocation('未知地区')
        }
      }
    }

    fetchLocation()
  }, [])

  // 获取今日访客数 (从busuanzi)
  useEffect(() => {
    const checkBusuanzi = () => {
      // busuanzi会通过全局DOM更新，我们需要监听变化
      const pageViewElement = document.querySelector('.busuanzi_value_page_pv')
      if (pageViewElement && pageViewElement.innerHTML) {
        setTodayVisitors(pageViewElement.innerHTML)
      }
    }

    // 初始检查
    checkBusuanzi()
    
    // 创建一个MutationObserver来监听busuanzi值的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('busuanzi_value_page_pv')) {
          setTodayVisitors(mutation.target.innerHTML || '-')
        }
      })
    })

    // 延迟开始观察，确保DOM元素存在
    const timer = setTimeout(() => {
      const targetNode = document.querySelector('.busuanzi_value_page_pv')
      if (targetNode) {
        observer.observe(targetNode, { childList: true, characterData: true, subtree: true })
        checkBusuanzi()
      }
    }, 2000)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <Card className='bg-white dark:bg-[#1e1e1e] hover:border-indigo-600 dark:hover:border-yellow-600 duration-200 dark:border-gray-700 wow fadeInUp'>
      <div className='flex flex-col space-y-3 p-2'>
        {/* 标题 */}
        <div className='flex items-center space-x-2 text-indigo-600 dark:text-yellow-500'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
          <span className='font-bold text-sm'>访客信息</span>
        </div>

        {/* 时间问候语 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>🕐</span>
          <span className='text-sm'>
            现在是<span className='font-semibold text-indigo-600 dark:text-yellow-500'>{currentTime}</span>，{greeting}
          </span>
        </div>

        {/* IP属地 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>📍</span>
          <span className='text-sm'>
            感谢来自<span className='font-semibold text-indigo-600 dark:text-yellow-500'>{location}</span>的朋友来访
          </span>
        </div>

        {/* 阅读时间 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>📖</span>
          <span className='text-sm'>
            您已经阅读了<span className='font-semibold text-indigo-600 dark:text-yellow-500'>{readingTime}</span>分钟，谢谢~
          </span>
        </div>

        {/* 今日访客数 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>👥</span>
          <span className='text-sm'>
            您是今天的第<span className='font-semibold text-indigo-600 dark:text-yellow-500'>{todayVisitors}</span>位读者
          </span>
        </div>
      </div>
    </Card>
  )
}
