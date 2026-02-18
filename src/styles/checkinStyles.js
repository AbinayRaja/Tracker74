
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 2,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
  },

  header: {
    height: 90,
    width: '100%',
    backgroundColor: '#6FA3E7',
    justifyContent: 'center',
    alignItems: 'center',
    // borderBottomLeftRadius: 30,
    // borderBottomRightRadius: 30,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 30,
  },

  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 16,
    // marginTop: 10,
    elevation: 6,
    height: '105%'
  },

  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcome: {
    fontSize: 16,
    fontWeight: '600',
  },

  subText: {
    fontSize: 12,
    color: '#777',
  },

  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  map: {
    width: '100%',
    height: 220,
    borderRadius: 15,
    marginVertical: 16,
  },

  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  locationText: {
    fontSize: 13,
    color: '#777',
  },

  dayText: {
    fontSize: 13,
    color: '#777',
  },

  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },

  dropdownText: {
    color: '#999',
  },

  checkInBtn: {
    backgroundColor: '#6FA3E7',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },

  checkInText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  signalText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
});

export default styles;
