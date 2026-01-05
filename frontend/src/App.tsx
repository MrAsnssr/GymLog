import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { WorkoutHistory } from './pages/WorkoutHistory'
import { WorkoutDetail } from './pages/WorkoutDetail'
import { NewWorkout } from './pages/NewWorkout'
import { PlanList } from './pages/PlanList'
import { PlanDetail } from './pages/PlanDetail'
import { PlanEditor } from './pages/PlanEditor'
import { FoodHistory } from './pages/FoodHistory'
import { Assistant } from './pages/Assistant'
import { ProfilePage } from './pages/Profile'
import { AdminPage } from './pages/Admin'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts"
            element={
              <ProtectedRoute>
                <WorkoutHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts/new"
            element={
              <ProtectedRoute>
                <NewWorkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts/:id"
            element={
              <ProtectedRoute>
                <WorkoutDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PlanList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/new"
            element={
              <ProtectedRoute>
                <PlanEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/:id"
            element={
              <ProtectedRoute>
                <PlanDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/:id/edit"
            element={
              <ProtectedRoute>
                <PlanEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/food"
            element={
              <ProtectedRoute>
                <FoodHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <Assistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
