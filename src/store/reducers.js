import { combineReducers } from 'redux'
import { routerReducer as router } from 'react-router-redux'
import { reducer as notification } from 'modules/notification'
import { firebaseStateReducer as firebase } from 'react-redux-firebase'
import { reducer as form } from 'redux-form'

export const makeRootReducer = (asyncReducers) => combineReducers({
    // Add sync reducers here
  firebase,
  form,
  router,
  notification,
  ...asyncReducers
})

export const injectReducer = (store, { key, reducer }) => {
  store.asyncReducers[key] = reducer
  store.replaceReducer(makeRootReducer(store.asyncReducers))
}

export default makeRootReducer
