/**
 * Redux middleware for logging actions and state changes
 */
import { Middleware } from 'redux';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ReduxLogger');

interface ReduxAction {
  type: string;
  payload?: unknown;
  [key: string]: unknown;
}

/**
 * Middleware that logs actions and state changes to the console
 */
export const loggerMiddleware: Middleware = store => next => action => {
  // We need to type cast the action to access its properties
  const typedAction = action as ReduxAction;
  
  // Log the current state
  logger.debug('Previous state:', store.getState());
  
  // Log the action details
  logger.info('Dispatching action:', { 
    type: typedAction.type, 
    payload: typedAction.payload 
  });
  
  // Call the next middleware in the chain
  const result = next(action);
  
  // Log the new state
  logger.debug('Next state:', store.getState());
  
  // Return the result
  return result;
};

export default loggerMiddleware; 