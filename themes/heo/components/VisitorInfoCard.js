import { useState, useEffect } from 'react'
import Card from './Card'
import { safeLocalStorageGet, safeLocalStorageSet } from '@/lib/utils'

const MINUTE_MS = 60000

function getGreeting(hours) {
  if (hours >= 5 && hours < 12) {
    return '早上好~'
  }
  if (hours >= 12 && hours < 14) {
    return '中午好~'
  }
  if (hours >= 14 && hours < 18) {
    return '下午好~'
  }
  if (hours >= 18 && hours < 22) {
    return '晚上好~'
  }
  return '夜深了~'
}

function getMillisecondsUntilNextMinute() {
  const now = new Date()
  const remainingSeconds = 60 - now.getSeconds()
  return remainingSeconds * 1000 - now.getMilliseconds()
}

/**
 * 访客信息卡片
 * 显示用户本地时间、IP属地、阅读时间和今日访客数
 * @returns
 */
export default function VisitorInfoCard() {
  const [clockState, setClockState] = useState({
    currentTime: '',
    greeting: ''
  })
  const [location, setLocation] = useState('加载中...')
  const [readingTime, setReadingTime] = useState(0)
  const [todayVisitors, setTodayVisitors] = useState('-')
  const parseStoredMinutes = value => {
    const minutes = parseInt(value || '0', 10)
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : 0
  }

  // 更新当前时间和问候语
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      // 格式化时间
      const formattedHours = hours.toString().padStart(2, '0')
      const formattedMinutes = minutes.toString().padStart(2, '0')
      const nextClockState = {
        currentTime: `${formattedHours}时${formattedMinutes}分`,
        greeting: getGreeting(hours)
      }

      setClockState(prev =>
        prev.currentTime === nextClockState.currentTime &&
        prev.greeting === nextClockState.greeting
          ? prev
          : nextClockState
      )
    }

    updateTimeAndGreeting()
    let intervalTimer = null
    const minuteTimer = setTimeout(() => {
      updateTimeAndGreeting()
      intervalTimer = setInterval(updateTimeAndGreeting, MINUTE_MS)
    }, getMillisecondsUntilNextMinute())

    return () => {
      clearTimeout(minuteTimer)
      clearInterval(intervalTimer)
    }
  }, [])

  // 更新阅读时间 - 记录当天总时间
  useEffect(() => {
    const updateReadingTime = () => {
      // 获取今天的日期字符串 YYYY-MM-DD (使用本地时间，而非UTC)
      const today = new Date().toLocaleDateString()
      const key = `reading_time_${today}`

      // 从 localStorage 获取今天的累积时间 (单位: 分钟)
      const storedTime = parseStoredMinutes(safeLocalStorageGet(key))

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

      const stored = safeLocalStorageGet(key)
      let newTime = 1
      if (stored) {
        newTime = parseStoredMinutes(stored) + 1
      }
      safeLocalStorageSet(key, newTime.toString())
      setReadingTime(newTime)
    }, 60000) // 每分钟更新

    return () => clearInterval(timer)
  }, [])

  // 获取用户IP属地
  useEffect(() => {
    let isActive = true
    const fetchLocation = async () => {
      try {
        // 使用 vore.top API获取IP和地理位置
        const response = await fetch('https://api.vore.top/api/IPdata')
        const data = await response.json()
        if (!isActive) return

        if (data.code === 200 && data.ipdata) {
          // 从返回数据中提取城市和ISP信息
          const city = data.ipdata.info2 || data.ipdata.info1 || '未知地区'
          // 仅显示城市，不显示运营商
          setLocation(city)
        } else {
          setLocation('未知地区')
        }
      } catch {
        // 尝试备用方案
        try {
          const response = await fetch('https://ipapi.co/json/')
          const data = await response.json()
          if (!isActive) return
          const city =
            data.city || data.region || data.country_name || '未知地区'
          setLocation(city)
        } catch {
          if (isActive) {
            setLocation('未知地区')
          }
        }
      }
    }

    fetchLocation()
    return () => {
      isActive = false
    }
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
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.target.classList.contains('busuanzi_value_page_pv')) {
          setTodayVisitors(mutation.target.textContent || '-')
        }
      })
    })

    // 延迟开始观察，确保DOM元素存在
    const timer = setTimeout(() => {
      const targetNode = document.querySelector('.busuanzi_value_page_pv')
      if (targetNode) {
        observer.observe(targetNode, {
          childList: true,
          characterData: true,
          subtree: true
        })
        checkBusuanzi()
      }
    }, BUSUANZI_CHECK_DELAY_MS)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <Card className='bg-white dark:bg-[#1e1e1e] hover:border-indigo-600 dark:hover:border-yellow-600 duration-200 dark:border-gray-700'>
      <div className='flex flex-col space-y-3 p-2'>
        {/* 标题 */}
        <div className='flex items-center space-x-2 text-indigo-600 dark:text-yellow-500'>
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='font-bold text-sm'>访客信息</span>
        </div>

        {/* 时间问候语 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>🕐</span>
          <span className='text-sm'>
            现在是
            <span className='font-semibold text-indigo-600 dark:text-yellow-500'>
              {clockState.currentTime}
            </span>
            ，{clockState.greeting}
          </span>
        </div>

        {/* IP属地 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>📍</span>
          <span className='text-sm'>
            欢迎来自
            <span className='font-semibold text-indigo-600 dark:text-yellow-500'>
              {location}
            </span>
            的朋友来访~
          </span>
        </div>

        {/* 阅读时间 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>📖</span>
          <span className='text-sm'>
            您已经阅读了
            <span className='font-semibold text-indigo-600 dark:text-yellow-500'>
              {readingTime}
            </span>
            分钟，谢谢~
          </span>
        </div>

        {/* 今日访客数 */}
        <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
          <span className='text-lg'>👥</span>
          <span className='text-sm'>
            您是今天的第
            <span className='font-semibold text-indigo-600 dark:text-yellow-500'>
              {todayVisitors}
            </span>
            位读者
          </span>
        </div>
      </div>
    </Card>
  )
}
