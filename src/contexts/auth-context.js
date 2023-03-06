import { Auth } from 'aws-amplify'
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import PropTypes from 'prop-types'
import { currentConfig } from 'aws-exports'

const HANDLERS = {
  INITIALIZE: 'INITIALIZE',
  SIGN_IN: 'SIGN_IN',
  SIGN_OUT: 'SIGN_OUT'
}

const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null
}

const handlers = {
  [HANDLERS.INITIALIZE]: (state, action) => {
    const user = action.payload

    return {
      ...state,
      ...// if payload (user) is provided, then is authenticated
      (user
        ? {
            isAuthenticated: true,
            isLoading: false,
            user
          }
        : {
            isLoading: false
          })
    }
  },
  [HANDLERS.SIGN_IN]: (state, action) => {
    const user = action.payload

    return {
      ...state,
      isAuthenticated: true,
      user
    }
  },
  [HANDLERS.SIGN_OUT]: state => {
    return {
      ...state,
      isAuthenticated: false,
      user: null
    }
  }
}

const reducer = (state, action) =>
  handlers[action.type] ? handlers[action.type](state, action) : state

// The role of this context is to propagate authentication state through the App tree.

export const AuthContext = createContext({ undefined })

export const AuthProvider = props => {
  const { children } = props
  const [state, dispatch] = useReducer(reducer, initialState)
  const initialized = useRef(false)

  const initialize = async () => {
    // Prevent from calling twice in development mode with React.StrictMode enabled
    if (initialized.current) {
      return
    }

    initialized.current = true

    let isAuthenticated = false

    try {
      const user = await Auth.currentAuthenticatedUser()
      isAuthenticated = true

      dispatch({
        type: HANDLERS.INITIALIZE,
        payload: user
      })
    } catch (err) {
      console.error(err)
    }

    if (!isAuthenticated) {
      dispatch({
        type: HANDLERS.INITIALIZE
      })
    }
  }

  useEffect(
    () => {
      initialize()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const signIn = async (email, password) => {
    try {
      const signInInfo = await Auth.signIn(email, password)
      const user = signInInfo
      dispatch({
        type: HANDLERS.SIGN_IN,
        payload: user
      })
    } catch (error) {
      throw new Error('Please check your email and password')
    }

    try {
      window.sessionStorage.setItem('authenticated', 'true')
    } catch (err) {
      console.error(err)
    }
  }

  const signUp = async (email, name, password) => {
    try {
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name
        }
      });
      dispatch({
        type: HANDLERS.SIGN_IN,
        payload: user
      });
    } catch (error) {
      console.error('Error signing up', error);
      throw new Error('There was an error signing up');
    }
  };
  

  const signOut = async () => {
    try {
      await Auth.signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
    dispatch({
      type: HANDLERS.SIGN_OUT
    })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node
}

export const AuthConsumer = AuthContext.Consumer

export const useAuthContext = () => useContext(AuthContext)
