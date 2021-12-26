import Element from 'element-ui';

export default function ({ store, redirect, route }) {
  const path = route.path;
  const isLoggedIn = store.getters.isAuthenticated;

  if (!isLoggedIn && path !== '/user/signin') {
    Element.Message.info('You need to Login first.');
    return redirect('/user/signin');
  }
  if (isLoggedIn && path === '/user/signin') {
    Element.Message.info('You are already logged in.');
    return redirect('/');
  }
}
