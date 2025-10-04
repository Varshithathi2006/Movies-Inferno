'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Trophy, Star, Gift, Gamepad2, Target, Zap, Crown, Medal, Award, Brain, ChevronDown } from 'lucide-react'

interface Message {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  question?: TriviaQuestion
}

interface TriviaQuestion {
  id: number
  question: string
  options: string[]
  correct: number
  points: number
  category: string
}

interface GameStats {
  questionsAnswered: number
  correctAnswers: number
  streak: number
  bestStreak: number
}

const GameChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userPoints, setUserPoints] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [gameStats, setGameStats] = useState<GameStats>({
    questionsAnswered: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Movie trivia questions database
  const triviaQuestions = [
    {
      id: 1,
      question: "Which movie won the Academy Award for Best Picture in 2020?",
      options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"],
      correct: 2,
      points: 10,
      category: "Awards"
    },
    {
      id: 2,
      question: "Who directed the movie 'Inception'?",
      options: ["Steven Spielberg", "Christopher Nolan", "Martin Scorsese", "Quentin Tarantino"],
      correct: 1,
      points: 10,
      category: "Directors"
    },
    {
      id: 3,
      question: "In which year was the first 'Star Wars' movie released?",
      options: ["1975", "1977", "1979", "1980"],
      correct: 1,
      points: 15,
      category: "Classic Movies"
    },
    {
      id: 4,
      question: "Which actor played the Joker in 'The Dark Knight'?",
      options: ["Joaquin Phoenix", "Jack Nicholson", "Heath Ledger", "Jared Leto"],
      correct: 2,
      points: 10,
      category: "Actors"
    },
    {
      id: 5,
      question: "What is the highest-grossing movie of all time (as of 2023)?",
      options: ["Avatar", "Avengers: Endgame", "Titanic", "Avatar: The Way of Water"],
      correct: 1,
      points: 15,
      category: "Box Office"
    },
    {
      id: 6,
      question: "Which movie features the quote 'May the Force be with you'?",
      options: ["Star Trek", "Star Wars", "Guardians of the Galaxy", "Interstellar"],
      correct: 1,
      points: 5,
      category: "Quotes"
    },
    {
      id: 7,
      question: "Who composed the music for 'The Lion King' (1994)?",
      options: ["John Williams", "Hans Zimmer", "Danny Elfman", "Alan Menken"],
      correct: 1,
      points: 15,
      category: "Music"
    },
    {
      id: 8,
      question: "Which movie is NOT part of the Marvel Cinematic Universe?",
      options: ["Doctor Strange", "Deadpool", "Black Panther", "Captain Marvel"],
      correct: 1,
      points: 10,
      category: "Franchises"
    },
    {
      id: 9,
      question: "What is the name of the coffee shop in the TV show 'Friends'?",
      options: ["Central Perk", "The Grind", "Java Joe's", "Coffee Bean"],
      correct: 0,
      points: 10,
      category: "TV Shows"
    },
    {
      id: 10,
      question: "Which animated movie features the song 'Let It Go'?",
      options: ["Moana", "Frozen", "Tangled", "Encanto"],
      correct: 1,
      points: 5,
      category: "Animation"
    }
  ]

  // Rewards system
  const rewards = [
    { points: 50, name: "Movie Buff Badge", emoji: "🎬", description: "You know your movies!" },
    { points: 100, name: "Trivia Master", emoji: "🧠", description: "Impressive knowledge!" },
    { points: 200, name: "Cinema Expert", emoji: "🏆", description: "You're a true movie expert!" },
    { points: 300, name: "Hollywood Legend", emoji: "⭐", description: "Legendary movie knowledge!" },
    { points: 500, name: "Ultimate Movie Guru", emoji: "👑", description: "You are the ultimate movie guru!" }
  ]

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      })
    }
  }

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollButton(!isNearBottom)
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom()
      setShowScrollButton(false)
    }, 150)
    
    return () => clearTimeout(timer)
  }, [messages])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.addEventListener('scroll', handleScroll)
        return () => viewport.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    // Welcome message
    const welcomeMessage: Message = {
      id: '1',
      type: 'bot',
      content: "🎮 Welcome to Movie Trivia Challenge! I'm your game host. Answer movie questions correctly to earn points and unlock rewards! Type 'start' to begin your first question, or 'help' for more info.",
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [])

  const getRandomQuestion = () => {
    const availableQuestions = triviaQuestions.filter(q => q.id !== currentQuestion?.id)
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
  }

  const handleAnswer = (selectedOption: number, question: TriviaQuestion) => {
    const isCorrect = selectedOption === question.correct
    const pointsEarned = isCorrect ? question.points : 0
    
    // Update stats
    const newStats = {
      ...gameStats,
      questionsAnswered: gameStats.questionsAnswered + 1,
      correctAnswers: isCorrect ? gameStats.correctAnswers + 1 : gameStats.correctAnswers,
      streak: isCorrect ? gameStats.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(gameStats.bestStreak, gameStats.streak + 1) : gameStats.bestStreak
    }
    setGameStats(newStats)

    // Bonus points for streaks
    let bonusPoints = 0
    if (isCorrect && newStats.streak >= 3) {
      bonusPoints = Math.floor(newStats.streak / 3) * 5
    }

    const totalPoints = pointsEarned + bonusPoints
    setUserPoints(prev => prev + totalPoints)
    setCurrentQuestion(null)

    // Create response message
    let responseContent = ""
    if (isCorrect) {
      responseContent = `🎉 Correct! You earned ${pointsEarned} points`
      if (bonusPoints > 0) {
        responseContent += ` + ${bonusPoints} bonus points for your ${newStats.streak}-question streak`
      }
      responseContent += `! 🌟`
      
      if (newStats.streak >= 5) {
        responseContent += ` Amazing ${newStats.streak}-question streak! 🔥`
      }
    } else {
      const correctAnswer = question.options[question.correct]
      responseContent = `❌ Incorrect. The correct answer was: ${correctAnswer}. Better luck next time! 💪`
      if (gameStats.streak > 0) {
        responseContent += ` Your streak of ${gameStats.streak} has ended.`
      }
    }

    // Check for new rewards
    const newRewards = rewards.filter(reward => 
      userPoints + totalPoints >= reward.points && userPoints < reward.points
    )

    if (newRewards.length > 0) {
      responseContent += `\n\n🎁 Congratulations! You've unlocked: ${newRewards.map(r => `${r.emoji} ${r.name}`).join(', ')}!`
    }

    responseContent += `\n\nType 'next' for another question or 'stats' to see your progress!`

    const botMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: responseContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, botMessage])
  }

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    setTimeout(() => {
      const lowerMessage = message.toLowerCase().trim()
      let botResponse = ""

      if (lowerMessage === 'start' || lowerMessage === 'next' || lowerMessage === 'question') {
        const question = getRandomQuestion()
        setCurrentQuestion(question)
        
        botResponse = `🎯 **${question.category}** - ${question.points} points\n\n${question.question}`
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botResponse,
          timestamp: new Date(),
          question: question
        }
        setMessages(prev => [...prev, botMessage])
      } else if (lowerMessage === 'stats' || lowerMessage === 'score') {
        const accuracy = gameStats.questionsAnswered > 0 ? 
          Math.round((gameStats.correctAnswers / gameStats.questionsAnswered) * 100) : 0
        
        botResponse = `📊 **Your Game Stats:**\n\n` +
          `🏆 Total Points: ${userPoints}\n` +
          `✅ Questions Answered: ${gameStats.questionsAnswered}\n` +
          `🎯 Correct Answers: ${gameStats.correctAnswers}\n` +
          `📈 Accuracy: ${accuracy}%\n` +
          `🔥 Current Streak: ${gameStats.streak}\n` +
          `⭐ Best Streak: ${gameStats.bestStreak}\n\n` +
          `Type 'rewards' to see available rewards or 'next' for another question!`
      } else if (lowerMessage === 'rewards' || lowerMessage === 'prizes') {
        const unlockedRewards = rewards.filter(r => userPoints >= r.points)
        const nextReward = rewards.find(r => userPoints < r.points)
        
        botResponse = `🎁 **Rewards Status:**\n\n`
        
        if (unlockedRewards.length > 0) {
          botResponse += `**Unlocked Rewards:**\n`
          unlockedRewards.forEach(reward => {
            botResponse += `${reward.emoji} ${reward.name} - ${reward.description}\n`
          })
          botResponse += `\n`
        }
        
        if (nextReward) {
          const pointsNeeded = nextReward.points - userPoints
          botResponse += `**Next Reward:**\n${nextReward.emoji} ${nextReward.name} (${pointsNeeded} more points needed)\n\n`
        }
        
        botResponse += `Type 'next' for another question!`
      } else if (lowerMessage === 'help') {
        botResponse = `🎮 **How to Play:**\n\n` +
          `• Type 'start' or 'next' to get a trivia question\n` +
          `• Click on your answer choice\n` +
          `• Earn points for correct answers\n` +
          `• Build streaks for bonus points\n` +
          `• Unlock rewards as you progress\n\n` +
          `**Commands:**\n` +
          `• 'stats' - View your progress\n` +
          `• 'rewards' - See available rewards\n` +
          `• 'next' - Get another question\n\n` +
          `Ready to start? Type 'start'!`
      } else {
        botResponse = `🤔 I didn't understand that command. Try:\n\n` +
          `• 'start' - Begin the trivia\n` +
          `• 'next' - Get another question\n` +
          `• 'stats' - View your progress\n` +
          `• 'rewards' - See rewards\n` +
          `• 'help' - Get help`
      }

      if (botResponse) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botResponse,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
      }

      setIsLoading(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Get user level based on points
  const getUserLevel = () => {
    if (userPoints >= 500) return { level: 'Master', icon: Crown, color: 'from-yellow-400 to-orange-500' }
    if (userPoints >= 300) return { level: 'Expert', icon: Medal, color: 'from-purple-400 to-pink-500' }
    if (userPoints >= 150) return { level: 'Pro', icon: Award, color: 'from-blue-400 to-cyan-500' }
    if (userPoints >= 50) return { level: 'Novice', icon: Star, color: 'from-green-400 to-emerald-500' }
    return { level: 'Beginner', icon: Brain, color: 'from-gray-400 to-slate-500' }
  }

  const userLevel = getUserLevel()

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23DC2626%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M20%2020c0-5.5-4.5-10-10-10s-10%204.5-10%2010%204.5%2010%2010%2010%2010-4.5%2010-10zm10%200c0-5.5-4.5-10-10-10s-10%204.5-10%2010%204.5%2010%2010%2010%2010-4.5%2010-10z%22/%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Floating Game Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-red-400/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-red-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-red-600/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <Card className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)] bg-black/60 backdrop-blur-xl border-red-500/30 shadow-2xl overflow-hidden">
          {/* Enhanced Header */}
          <CardHeader className="bg-gradient-to-r from-red-600/30 to-red-900/30 backdrop-blur-sm border-b border-red-500/20 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-400/30">
                    <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                    <Zap className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                    Movie Trivia Arena
                  </CardTitle>
                  <p className="text-sm text-gray-300 mt-1">Challenge your cinema knowledge! 🎬</p>
                </div>
              </div>
              
              {/* Enhanced Stats Display */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-bold text-lg sm:text-xl">{userPoints}</span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium">Points</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-bold text-lg sm:text-xl">{gameStats.streak}</span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium">Streak</p>
                </div>
                <div className="hidden sm:block text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <userLevel.icon className="h-4 w-4 text-white" />
                    <Badge className={`bg-gradient-to-r ${userLevel.color} text-white border-none text-xs font-bold px-2 py-1`}>
                      {userLevel.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-300 font-medium">Rank</p>
                </div>
              </div>
            </div>
          </CardHeader>

          
          <CardContent className="p-0 h-[calc(100%-140px)] sm:h-[calc(100%-180px)] flex flex-col relative">
            {/* Enhanced Messages Area */}
            <ScrollArea 
              className="flex-1 px-4 sm:px-6 py-4 sm:py-6" 
              ref={scrollAreaRef}
            >
              <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 sm:gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-400/30">
                          <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[75%] ${message.type === 'user' ? 'order-1' : ''}`}>
                      <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg backdrop-blur-sm border transition-all duration-200 hover:shadow-xl ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-r from-red-600/90 to-red-800/90 text-white border-red-400/30 ml-auto' 
                          : 'bg-black/30 text-white border-red-500/20 hover:bg-black/40'
                      }`}>
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                          {message.content}
                        </p>
                        
                        {/* Enhanced Question Options */}
                        {message.question && (
                          <div className="mt-4 sm:mt-6 space-y-3">
                            <div className="flex items-center justify-between mb-4">
                              <Badge className={`bg-gradient-to-r ${userLevel.color} text-white border-none text-xs font-bold px-3 py-1`}>
                                {message.question.category}
                              </Badge>
                              <div className="flex items-center gap-2 text-yellow-400">
                                <Trophy className="h-4 w-4" />
                                <span className="font-bold text-sm">{message.question.points} pts</span>
                              </div>
                            </div>
                            {message.question.options.map((option, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                className="w-full justify-start text-left bg-gradient-to-r from-black/50 to-black/60 hover:from-red-600/30 hover:to-red-800/30 border-red-500/30 hover:border-red-400/50 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 rounded-xl"
                                onClick={() => message.question && handleAnswer(index, message.question)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {String.fromCharCode(65 + index)}
                                  </div>
                                  <span className="font-medium">{option}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 sm:mt-4">
                          <div className="flex items-center gap-2">
                            {message.question && (
                              <Badge variant="secondary" className="bg-red-500/20 text-red-200 border-red-400/30 text-xs">
                                <Target className="h-3 w-3 mr-1" />
                                Trivia
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 font-medium">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-400/30">
                          <userLevel.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 sm:gap-4 justify-start animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg animate-pulse ring-2 ring-red-400/30">
                        <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-red-500/20 min-w-[200px] shadow-lg">
                      <div className="flex gap-3 items-center">
                        <span className="text-sm sm:text-base text-gray-200 font-medium">Preparing your challenge</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Enhanced Scroll to bottom button */}
            {showScrollButton && (
              <div className="absolute bottom-32 right-6 z-10">
                <Button
                  onClick={scrollToBottom}
                  size="sm"
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 rounded-full p-3 border border-red-400/20 backdrop-blur-sm"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Enhanced Quick Actions */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-red-400/20 bg-gradient-to-r from-black/20 to-black/30 backdrop-blur-sm">
              <div className="mb-4">
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 flex items-center justify-center gap-2">
                  <span className="text-lg">🎮</span>
                  <span className="bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                    Quick Actions
                  </span>
                </h4>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center max-w-4xl mx-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage('next')}
                    className="bg-gradient-to-r from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 border-red-500/30 hover:border-red-400/50 text-red-200 hover:text-white transition-all duration-300 hover:scale-105 rounded-xl px-4 py-2 font-semibold"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Next Question
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage('stats')}
                    className="bg-gradient-to-r from-red-700/20 to-black/20 hover:from-red-700/30 hover:to-black/30 border-red-500/30 hover:border-red-400/50 text-red-200 hover:text-white transition-all duration-300 hover:scale-105 rounded-xl px-4 py-2 font-semibold"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    My Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage('rewards')}
                    className="bg-gradient-to-r from-red-800/20 to-black/20 hover:from-red-800/30 hover:to-black/30 border-red-500/30 hover:border-red-400/50 text-red-200 hover:text-white transition-all duration-300 hover:scale-105 rounded-xl px-4 py-2 font-semibold"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Rewards
                  </Button>
                </div>
              </div>

              {/* Enhanced Input area */}
              <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type 'start' to begin, or ask for 'help'..."
                    className="w-full bg-black/20 backdrop-blur-sm border-red-500/20 text-white placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/20 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm sm:text-base font-medium shadow-lg transition-all duration-200 focus:shadow-xl"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-black/5 rounded-xl sm:rounded-2xl pointer-events-none"></div>
                </div>
                <Button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-500 disabled:to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 font-semibold"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GameChatbot