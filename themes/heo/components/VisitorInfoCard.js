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

  // 更新阅读时间 - 记录当天总时间
  useEffect(() => {
    const updateReadingTime = () => {
      // 获取今天的日期字符串 YYYY-MM-DD (使用本地时间，而非UTC)
      const today = new Date().toLocaleDateString()
      const key = `reading_time_${today}`

      // 从 localStorage 获取今天的累积时间 (单位: 分钟)
      let storedTime = 0
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          storedTime = parseInt(stored, 10)
        }
      } catch (e) {
        console.error('Failed to read reading time:', e)
      }

      // 计算本次会话的增加时间
      // 为了避免重复计算，我们每分钟增加 1 分钟到 localStorage
      // 初始化时，只显示存储的时间，随后每分钟 +1
      setReadingTime(storedTime)
    }

    // 初始加载
    updateReadingTime()

    // 每分钟增加并保存
    const timer = setInterval(() => {
      const today = new Date().toLocaleDateString()
      const key = `reading_time_${today}`

      try {
        const stored = localStorage.getItem(key)
        let newTime = 1
        if (stored) {
          newTime = parseInt(stored, 10) + 1
        }
        localStorage.setItem(key, newTime.toString())
        setReadingTime(newTime)
      } catch (e) {
        console.error('Failed to save reading time:', e)
      }
    }, 60000) // 每分钟更新

    return () => clearInterval(timer)
  }, [])

  // 获取用户IP属地
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // 使用 vore.top API获取IP和地理位置
        const response = await fetch('https://api.vore.top/api/IPdata')
        const data = await response.json()
        
        if (data.code === 200 && data.ipdata) {
          // 从返回数据中提取城市和ISP信息
          const city = data.ipdata.info2 || data.ipdata.info1 || '未知地区'
          // 仅显示城市，不显示运营商
          setLocation(city)
        } else {
          setLocation('未知地区')
        }
      } catch (error) {
        console.warn('获取IP位置失败 (api.vore.top):', error)
        // 尝试备用方案
        try {
          const response = await fetch('https://ipapi.co/json/')
          const data = await response.json()
          const city = data.city || data.region || data.country_name || '未知地区'
          setLocation(city)
        } catch (err) {
          console.warn('获取IP位置失败 (ipapi.co):', err)
          setLocation('未知地区')
        }
      }
    }

    fetchLocation()
  }, [])

  // 获取今日访客数 (从busuanzi)
  // 延迟常量 - busuanzi需要一定时间加载
  const BUSUANZI_CHECK_DELAY_MS = 2000

  useEffect(() => {
    const checkBusuanzi = () => {
      // busuanzi会通过全局DOM更新，我们需要监听变化
      const pageViewElement = document.querySelector('.busuanzi_value_page_pv')
      if (pageViewElement && pageViewElement.textContent) {
        setTodayVisitors(pageViewElement.textContent)
      }
    }

    // 初始检查
    checkBusuanzi()
    
    // 创建一个MutationObserver来监听busuanzi值的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('busuanzi_value_page_pv')) {
          setTodayVisitors(mutation.target.textContent || '-')
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
    }, BUSUANZI_CHECK_DELAY_MS)

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
            欢迎来自<span className='font-semibold text-indigo-600 dark:text-yellow-500'>{location}</span>的朋友来访~
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
