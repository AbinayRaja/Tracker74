import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
  },

  header: {
    height: 90,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuIcon: {
    position: 'absolute',
    top: 20,
    left: 15,
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    elevation: 4,
  },

  content: {
    padding: 20,
    paddingTop: 40,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },

  loginBtn: {
    backgroundColor: '#6ED6A8',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },

  loginText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  forgot: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 13,
    color: '#4A90E2',
  },
});

export default styles;
