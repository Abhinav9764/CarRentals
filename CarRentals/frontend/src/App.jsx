import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL =
  (typeof window !== 'undefined' && window.__API_BASE_URL__) ||
  (typeof process !== 'undefined' &&
    // eslint-disable-next-line no-undef
    process.env &&
    // eslint-disable-next-line no-undef
    process.env.REACT_APP_API_BASE_URL) ||
  'http://localhost:8081'

const CARS_URL = `${API_BASE_URL}/api/cars`
const CREATE_CAR_URL = `${CARS_URL}/path`
const LOGIN_URL = `${API_BASE_URL}/api/auth/login`
const REGISTER_URL = `${API_BASE_URL}/api/auth/register`
const BOOKING_STORAGE_KEY = 'car-rentals-bookings-v1'
const AUTH_STORAGE_KEY = 'car-rentals-auth-v1'

const initialCar = { make: '', model: '', pricePerDay: '', available: true }
const initialBooking = {
  customerName: '',
  carId: '',
  startDate: '',
  endDate: '',
}
const initialAuthForm = {
  name: '',
  email: '',
  password: '',
  role: 'CUSTOMER',
}

const tabConfig = [
  { id: 'cars', label: 'Cars' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'insights', label: 'Insights' },
]

const composerConfig = [
  { id: 'car', label: 'Car' },
  { id: 'booking', label: 'Booking' },
]

async function request(url, options = {}) {
  let response

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
    throw new Error(`Cannot reach backend API at ${API_BASE_URL}.`)
  }

  if (!response.ok) {
    const rawBody = await response.text()
    let message = ''

    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody)
        message = parsed.message || parsed.error || parsed.detail || parsed.title || ''
      // eslint-disable-next-line no-unused-vars
      } catch (error) {
        message = ''
      }
    }

    if (!message) {
      if (response.status === 500 && url.includes('/api/')) {
        message = 'Backend API is unavailable. Start Spring Boot on port 8081.'
      } else {
        message = `Request failed (${response.status})`
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.text()
  if (!payload) {
    return null
  }

  try {
    return JSON.parse(payload)
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return null
  }
}

function normalize(value) {
  return String(value ?? '').toLowerCase().trim()
}

function timeStamp() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

function bookingDate(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function App() {
  const [cars, setCars] = useState([])
  const [bookings, setBookings] = useState([])

  const [carForm, setCarForm] = useState(initialCar)
  const [bookingForm, setBookingForm] = useState(initialBooking)

  const [activeTab, setActiveTab] = useState('cars')
  const [composerType, setComposerType] = useState('car')
  const [queries, setQueries] = useState({
    cars: '',
    bookings: '',
    insights: '',
  })
  const [sortBy, setSortBy] = useState('recommended')
  const [viewMode, setViewMode] = useState('grid')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({
    tone: 'neutral',
    text: 'Connecting to rental operations...',
  })
  const [lastSync, setLastSync] = useState('--:--')
  const [activity, setActivity] = useState([])

  const [selectedCarId, setSelectedCarId] = useState(null)
  const [rentalDays, setRentalDays] = useState(3)
  const [sessionUser, setSessionUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('Sign in to continue.')

  const addActivity = useCallback((message) => {
    const event = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      at: timeStamp(),
    }
    setActivity((prev) => [event, ...prev].slice(0, 12))
  }, [])

  const fetchCars = useCallback(async () => {
    const carData = await request(CARS_URL)
    return Array.isArray(carData) ? carData : []
  }, [])

  const syncAll = useCallback(
    async (reason = 'Data refresh') => {
      setLoading(true)
      setStatus({ tone: 'neutral', text: 'Synchronizing fleet data...' })

      try {
        const carData = await fetchCars()
        setCars(carData)
        setLastSync(timeStamp())
        setStatus({ tone: 'success', text: 'Fleet data is up to date.' })
        addActivity(`${reason} completed`)
      } catch (error) {
        setStatus({
          tone: 'error',
          text: error.message || 'Unable to synchronize records.',
        })
        addActivity('Data synchronization failed')
      } finally {
        setLoading(false)
      }
    },
    [addActivity, fetchCars],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(BOOKING_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setBookings(parsed)
      }
    } catch (error) {
      setBookings([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings))
  }, [bookings])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.email && parsed.role) {
        setSessionUser(parsed)
      }
    } catch (error) {
      setSessionUser(null)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!sessionUser) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser))
  }, [sessionUser])

  useEffect(() => {
    if (!sessionUser) return
    syncAll('Initial load')
  }, [sessionUser, syncAll])

  useEffect(() => {
    if (!cars.length) {
      setSelectedCarId(null)
      return
    }

    if (!selectedCarId || !cars.some((item) => item.id === selectedCarId)) {
      setSelectedCarId(cars[0].id)
    }
  }, [cars, selectedCarId])

  const filteredCars = useMemo(() => {
    const query = normalize(queries.cars)
    const filtered = cars.filter((item) => {
      if (!query) return true
      return (
        normalize(item.id).includes(query) ||
        normalize(item.make).includes(query) ||
        normalize(item.model).includes(query) ||
        normalize(item.pricePerDay).includes(query)
      )
    })

    const sorted = [...filtered]
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => Number(a.pricePerDay) - Number(b.pricePerDay))
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => Number(b.pricePerDay) - Number(a.pricePerDay))
    } else if (sortBy === 'make-asc') {
      sorted.sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
    } else {
      sorted.sort((a, b) => {
        if (a.available !== b.available) {
          return a.available ? -1 : 1
        }
        return Number(a.pricePerDay) - Number(b.pricePerDay)
      })
    }

    return sorted
  }, [cars, queries.cars, sortBy])

  const enrichedBookings = useMemo(() => {
    return bookings.map((item) => {
      const matchedCar = cars.find((car) => String(car.id) === String(item.carId))
      return {
        ...item,
        carLabel: matchedCar
          ? `${matchedCar.make} ${matchedCar.model}`
          : item.carLabel || `Car #${item.carId}`,
      }
    })
  }, [bookings, cars])

  const filteredBookings = useMemo(() => {
    const query = normalize(queries.bookings)
    const filtered = enrichedBookings.filter((item) => {
      if (!query) return true
      return (
        normalize(item.id).includes(query) ||
        normalize(item.customerName).includes(query) ||
        normalize(item.carLabel).includes(query) ||
        normalize(item.startDate).includes(query) ||
        normalize(item.endDate).includes(query)
      )
    })

    return [...filtered].sort((left, right) => {
      const leftDate = bookingDate(left.startDate)
      const rightDate = bookingDate(right.startDate)

      if (!leftDate && !rightDate) return 0
      if (!leftDate) return 1
      if (!rightDate) return -1
      return leftDate - rightDate
    })
  }, [enrichedBookings, queries.bookings])

  const nextPickup = useMemo(() => {
    const now = new Date()
    return filteredBookings.find((item) => {
      const start = bookingDate(item.startDate)
      return start && start >= now
    })
  }, [filteredBookings])

  const bookingsNext24h = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return filteredBookings.filter((item) => {
      const start = bookingDate(item.startDate)
      return start && start >= now && start <= cutoff
    }).length
  }, [filteredBookings])

  const metrics = useMemo(() => {
    const available = cars.filter((item) => item.available).length
    const rates = cars.map((item) => Number(item.pricePerDay) || 0)
    const avgRate = rates.length
      ? rates.reduce((sum, value) => sum + value, 0) / rates.length
      : 0
    const localRevenue = bookings.reduce(
      (sum, item) => sum + (Number(item.totalPrice) || 0),
      0,
    )

    return [
      { label: 'Fleet Cars', value: cars.length, detail: 'Total inventory' },
      { label: 'Available Now', value: available, detail: 'Ready to rent' },
      { label: 'Avg Daily Rate', value: formatCurrency(avgRate), detail: 'Current fleet' },
      { label: 'Local Revenue', value: formatCurrency(localRevenue), detail: 'From bookings' },
    ]
  }, [bookings, cars])

  const selectedCar = useMemo(() => {
    if (!selectedCarId) return null
    return cars.find((item) => item.id === selectedCarId) || null
  }, [cars, selectedCarId])

  const isAdmin = sessionUser?.role === 'ADMIN'

  const availableComposerConfig = useMemo(() => {
    if (isAdmin) {
      return composerConfig
    }

    return composerConfig.filter((item) => item.id === 'booking')
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin && composerType === 'car') {
      setComposerType('booking')
    }
  }, [composerType, isAdmin])

  const carRows = useMemo(() => {
    return filteredCars.map((item) => ({
      key: item.id,
      cells: [
        `#${item.id}`,
        `${item.make} ${item.model}`,
        formatCurrency(item.pricePerDay),
        item.available ? 'Available' : 'Unavailable',
        <button
          key={`car-focus-${item.id}`}
          type="button"
          className="mini-btn"
          onClick={() => setSelectedCarId(item.id)}
        >
          View
        </button>,
      ],
    }))
  }, [filteredCars])

  const handleDeleteBooking = useCallback(
    (id) => {
      const approved = window.confirm(`Delete booking ${id}?`)
      if (!approved) return

      setBookings((prev) => prev.filter((item) => item.id !== id))
      setStatus({ tone: 'success', text: `Booking ${id} deleted.` })
      addActivity(`Booking ${id} removed`)
    },
    [addActivity],
  )

  const bookingRows = useMemo(() => {
    return filteredBookings.map((item) => ({
      key: item.id,
      cells: [
        item.id,
        item.customerName,
        item.carLabel,
        `${item.startDate} to ${item.endDate}`,
        formatCurrency(item.totalPrice),
        <button
          key={`booking-delete-${item.id}`}
          type="button"
          className="mini-btn"
          onClick={() => handleDeleteBooking(item.id)}
        >
          Delete
        </button>,
      ],
    }))
  }, [filteredBookings, handleDeleteBooking])

  const insightsRows = useMemo(() => {
    const unavailable = cars.filter((item) => !item.available).length
    const highestRate = cars.length
      ? Math.max(...cars.map((item) => Number(item.pricePerDay) || 0))
      : 0

    return [
      { key: 'upcoming', label: 'Pickups Next 24h', value: bookingsNext24h },
      { key: 'active', label: 'Bookings Logged', value: bookings.length },
      { key: 'busy', label: 'Unavailable Cars', value: unavailable },
      { key: 'top-rate', label: 'Highest Daily Rate', value: formatCurrency(highestRate) },
    ]
  }, [bookings.length, bookingsNext24h, cars])

  function updateAuthField(field, value) {
    setAuthForm((prev) => ({ ...prev, [field]: value }))
  }

  function switchAuthMode(mode) {
    setAuthMode(mode)
    setAuthError('')
    setAuthMessage(mode === 'login' ? 'Sign in to continue.' : 'Create an account to get started.')
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    const email = authForm.email.trim()
    const password = authForm.password
    const name = authForm.name.trim()
    const role = authForm.role

    try {
      let payload = null

      if (authMode === 'register') {
        payload = await request(REGISTER_URL, {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            role,
          }),
        })
      } else {
        payload = await request(LOGIN_URL, {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
          }),
        })
      }

      if (!payload || !payload.email || !payload.role) {
        throw new Error('Unexpected authentication response.')
      }

      const authenticatedUser = {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      }

      setSessionUser(authenticatedUser)
      setAuthForm(initialAuthForm)
      setAuthMessage(payload.message || 'Authentication successful.')
      setStatus({ tone: 'success', text: `Welcome ${authenticatedUser.name || authenticatedUser.email}.` })
      addActivity(`Signed in as ${authenticatedUser.role}`)
      setComposerType(authenticatedUser.role === 'ADMIN' ? 'car' : 'booking')
    } catch (error) {
      setAuthError(error.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    setSessionUser(null)
    setAuthMode('login')
    setAuthForm(initialAuthForm)
    setAuthError('')
    setAuthMessage('You have been signed out.')
    setStatus({ tone: 'neutral', text: 'Sign in to resume rental operations.' })
  }

  function onQueryChange(value) {
    setQueries((prev) => ({ ...prev, [activeTab]: value }))
  }

  async function createCar() {
    if (!isAdmin) {
      throw new Error('Only admin accounts can add cars.')
    }

    const make = carForm.make.trim()
    const model = carForm.model.trim()
    const price = Number(carForm.pricePerDay)

    if (!make || !model) {
      throw new Error('Make and model are required.')
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price per day must be a positive number.')
    }

    const createdCar = await request(CREATE_CAR_URL, {
      method: 'POST',
      body: JSON.stringify({
        make,
        model,
        pricePerDay: price,
        available: carForm.available,
      }),
    })

    setCarForm(initialCar)
    setStatus({ tone: 'success', text: 'Car created successfully.' })
    addActivity(`Car "${make} ${model}" added`)
    await syncAll('Car create')

    if (createdCar && createdCar.id) {
      setSelectedCarId(createdCar.id)
    }

    setActiveTab('cars')
  }

  async function createBooking() {
    const customerName = bookingForm.customerName.trim()
    const startDate = bookingForm.startDate
    const endDate = bookingForm.endDate
    const selected = cars.find((item) => String(item.id) === String(bookingForm.carId))

    if (!customerName) {
      throw new Error('Customer name is required.')
    }
    if (!selected) {
      throw new Error('Please select a valid car for this booking.')
    }
    if (!startDate || !endDate) {
      throw new Error('Start and end dates are required.')
    }

    const start = bookingDate(startDate)
    const end = bookingDate(endDate)
    if (!start || !end) {
      throw new Error('Please provide valid booking dates.')
    }
    if (end < start) {
      throw new Error('End date cannot be earlier than start date.')
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const days = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1
    const totalPrice = (Number(selected.pricePerDay) || 0) * days

    const booking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      customerName,
      carId: String(selected.id),
      carLabel: `${selected.make} ${selected.model}`,
      startDate,
      endDate,
      days,
      totalPrice,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    }

    setBookings((prev) => [booking, ...prev])
    setBookingForm(initialBooking)
    setStatus({ tone: 'success', text: `Booking ${booking.id} created locally.` })
    addActivity(`Booking ${booking.id} scheduled for ${customerName}`)
    setActiveTab('bookings')
  }

  async function handleComposerSubmit(event) {
    event.preventDefault()
    setSubmitting(true)

    try {
      if (composerType === 'car') {
        await createCar()
      } else {
        await createBooking()
      }
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Could not save record.' })
      addActivity('Create action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const statusToneClass =
    status.tone === 'success'
      ? 'notice-success'
      : status.tone === 'error'
        ? 'notice-error'
        : ''

  if (!sessionUser) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p className="hero-eyebrow">Velocity Drive Rentals</p>
          <h1 className="auth-title">
            {authMode === 'login' ? 'Login to Continue' : 'Register Your Account'}
          </h1>
          <p className="muted auth-copy">{authMessage}</p>

          <div className="chips" style={{ marginBottom: '0.8rem' }}>
            <button
              type="button"
              className={authMode === 'login' ? 'chip chip-active' : 'chip'}
              onClick={() => switchAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'chip chip-active' : 'chip'}
              onClick={() => switchAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label>
                Full Name
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => updateAuthField('name', event.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => updateAuthField('email', event.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => updateAuthField('password', event.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </label>

            {authMode === 'register' ? (
              <label>
                Account Type
                <select
                  value={authForm.role}
                  onChange={(event) => updateAuthField('role', event.target.value)}
                  required
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
            ) : null}

            {authError ? <p className="form-error">{authError}</p> : null}

            <button className="primary-btn" type="submit" disabled={authLoading}>
              {authLoading
                ? authMode === 'login'
                  ? 'Signing in...'
                  : 'Registering...'
                : authMode === 'login'
                  ? 'Login'
                  : 'Register'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero-eyebrow">Velocity Drive Rentals</p>
          <h1 className="hero-title">Car Rental Workspace</h1>
          <p className="hero-subtitle">
            Manage inventory, create rentals, and monitor operations from one
            interactive dashboard.
          </p>
        </div>

        <div className="hero-stats">
          {metrics.slice(0, 3).map((metric) => (
            <article key={metric.label} className="stat-card">
              <p>{metric.label}</p>
              <h3>{metric.value}</h3>
            </article>
          ))}
          <article className="stat-card">
            <p>Logged In</p>
            <h3>{sessionUser.name || sessionUser.email}</h3>
            <small className="role-pill">{sessionUser.role}</small>
          </article>
        </div>
      </header>

      <section className="panel controls">
        <div className="search-block">
          <label htmlFor="global-search">Search</label>
          <input
            id="global-search"
            type="text"
            value={queries[activeTab]}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Search ${activeTab}`}
          />
        </div>

        <div className="control-group">
          <label htmlFor="sort-by">Sort Cars</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            disabled={activeTab !== 'cars'}
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="make-asc">Name: A to Z</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="view-mode">Car View</label>
          <select
            id="view-mode"
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value)}
            disabled={activeTab !== 'cars'}
          >
            <option value="grid">Grid</option>
            <option value="table">Table</option>
          </select>
        </div>

        <div className="chips">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'chip chip-active' : 'chip'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="action-group">
          <button className="ghost-btn" type="button" onClick={() => syncAll('Manual refresh')}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="primary-btn"
            type="button"
            onClick={() => setQueries({ cars: '', bookings: '', insights: '' })}
          >
            Clear Search
          </button>
          <button className="ghost-btn" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className={`panel notice ${statusToneClass}`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap',
          }}
        >
          <span>{status.text}</span>
          <small>Last sync: {lastSync}</small>
        </div>
      </section>

      <main className="content-layout">
        <section className="panel list-panel">
          <div className="section-head">
            <h2>
              {activeTab === 'cars'
                ? 'Fleet'
                : activeTab === 'bookings'
                  ? 'Bookings'
                  : 'Business Insights'}
            </h2>
            <p>
              {activeTab === 'cars'
                ? `${filteredCars.length} car(s)`
                : activeTab === 'bookings'
                  ? `${filteredBookings.length} booking(s)`
                  : 'Performance snapshot'}
            </p>
          </div>

          {activeTab === 'cars' && (
            <>
              {loading ? <p className="muted">Loading cars...</p> : null}
              {!loading && !filteredCars.length ? (
                <p className="muted">No cars match the current search.</p>
              ) : null}

              {!loading && filteredCars.length > 0 && viewMode === 'grid' ? (
                <div className="car-grid">
                  {filteredCars.map((item) => (
                    <article
                      key={item.id}
                      className={
                        selectedCarId === item.id ? 'car-card car-card-active' : 'car-card'
                      }
                      onClick={() => setSelectedCarId(item.id)}
                    >
                      <div className="car-title-row">
                        <h3>
                          {item.make} {item.model}
                        </h3>
                        <span className="pill">
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <p className="car-price">{formatCurrency(item.pricePerDay)} / day</p>
                      <p className="muted" style={{ margin: 0 }}>
                        ID: #{item.id}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}

              {!loading && filteredCars.length > 0 && viewMode === 'table' ? (
                <DataTable
                  headers={['ID', 'Car', 'Daily Rate', 'Status', 'Action']}
                  rows={carRows}
                  emptyMessage="No car records found."
                />
              ) : null}
            </>
          )}

          {activeTab === 'bookings' && (
            <DataTable
              headers={[
                'Booking ID',
                'Customer',
                'Car',
                'Rental Window',
                'Total',
                'Action',
              ]}
              rows={bookingRows}
              emptyMessage="No bookings have been created yet."
            />
          )}

          {activeTab === 'insights' && (
            <div className="car-grid">
              {insightsRows.map((item) => (
                <article key={item.key} className="car-card">
                  <p className="muted" style={{ margin: 0 }}>
                    {item.label}
                  </p>
                  <p className="car-price" style={{ marginBottom: 0 }}>
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel detail-panel">
          <div className="section-head">
            <h2>Quick Create</h2>
            <p>{isAdmin ? 'Save records instantly' : 'Create customer bookings'}</p>
          </div>

          <div className="chips" style={{ marginBottom: '0.8rem' }}>
            {availableComposerConfig.map((item) => (
              <button
                key={item.id}
                type="button"
                className={composerType === item.id ? 'chip chip-active' : 'chip'}
                onClick={() => setComposerType(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="car-form" onSubmit={handleComposerSubmit}>
            {composerType === 'car' && (
              <>
                <label>
                  Make
                  <input
                    type="text"
                    value={carForm.make}
                    onChange={(event) =>
                      setCarForm((prev) => ({ ...prev, make: event.target.value }))
                    }
                    placeholder="Toyota"
                    required
                  />
                </label>

                <label>
                  Model
                  <input
                    type="text"
                    value={carForm.model}
                    onChange={(event) =>
                      setCarForm((prev) => ({ ...prev, model: event.target.value }))
                    }
                    placeholder="Corolla"
                    required
                  />
                </label>

                <label>
                  Price / Day
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={carForm.pricePerDay}
                    onChange={(event) =>
                      setCarForm((prev) => ({ ...prev, pricePerDay: event.target.value }))
                    }
                    placeholder="79.99"
                    required
                  />
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={carForm.available}
                    onChange={(event) =>
                      setCarForm((prev) => ({ ...prev, available: event.target.checked }))
                    }
                  />
                  Available for booking
                </label>
              </>
            )}

            {composerType === 'booking' && (
              <>
                <label>
                  Customer Name
                  <input
                    type="text"
                    value={bookingForm.customerName}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, customerName: event.target.value }))
                    }
                    placeholder="Enter customer name"
                    required
                  />
                </label>

                <label>
                  Car
                  <select
                    value={bookingForm.carId}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, carId: event.target.value }))
                    }
                    style={{
                      width: '100%',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      borderRadius: '10px',
                      padding: '0.6rem 0.65rem',
                    }}
                    required
                  >
                    <option value="">Select a car</option>
                    {cars.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.make} {item.model} ({formatCurrency(item.pricePerDay)}/day)
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Start Date
                  <input
                    type="date"
                    value={bookingForm.startDate}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    style={{
                      width: '100%',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      borderRadius: '10px',
                      padding: '0.6rem 0.65rem',
                    }}
                    required
                  />
                </label>

                <label>
                  End Date
                  <input
                    type="date"
                    value={bookingForm.endDate}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                    style={{
                      width: '100%',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      borderRadius: '10px',
                      padding: '0.6rem 0.65rem',
                    }}
                    required
                  />
                </label>
              </>
            )}

            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : `Save ${composerType}`}
            </button>
          </form>

          <div className="estimate" style={{ marginTop: '1rem' }}>
            <label>Focused Car Estimate</label>
            {selectedCar ? (
              <>
                <p style={{ margin: '0.2rem 0' }}>
                  {selectedCar.make} {selectedCar.model}
                </p>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={rentalDays}
                  onChange={(event) => setRentalDays(Number(event.target.value))}
                />
                <p>
                  {rentalDays} day(s):{' '}
                  <strong>{formatCurrency((selectedCar.pricePerDay || 0) * rentalDays)}</strong>
                </p>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Select a car from the list to preview estimated cost.
              </p>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="section-head" style={{ marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1rem' }}>Next Pickup</h2>
              <p>{bookingsNext24h} in next 24h</p>
            </div>
            {nextPickup ? (
              <p style={{ margin: 0 }}>
                {nextPickup.customerName} | {nextPickup.carLabel} | {nextPickup.startDate}
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No upcoming pickups.
              </p>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="section-head" style={{ marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1rem' }}>Activity Feed</h2>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setActivity([])}
                disabled={!activity.length}
              >
                Clear
              </button>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              {activity.map((item) => (
                <li key={item.id} style={{ marginBottom: '0.35rem' }}>
                  <span>{item.message}</span>{' '}
                  <small className="muted" style={{ marginLeft: '0.35rem' }}>
                    {item.at}
                  </small>
                </li>
              ))}
              {!activity.length ? (
                <li className="muted">No recent actions yet.</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  )
}

function DataTable({ headers, rows, emptyMessage }) {
  if (!rows.length) {
    return <p className="muted">{emptyMessage}</p>
  }

  return (
    <div className="table-wrap">
      <table className="car-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
