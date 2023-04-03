import { useUnleashClient, useUnleashContext } from '@unleash/proxy-client-react';
import { useLayoutEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { featureFlagsActions } from 'store/featureFlags';

// eslint-disable-next-line no-shadow
export const enum FeatureToggle {
  costDistribution = 'cost-management.ui.cost-distribution', // Cost distribution https://issues.redhat.com/browse/COST-3249
  exports = 'cost-management.ui.exports', // Async exports https://issues.redhat.com/browse/COST-2223
  finsights = 'cost-management.ui.finsights', // RHEL support for FINsights https://issues.redhat.com/browse/COST-3306
  ibm = 'cost-management.ui.ibm', // IBM https://issues.redhat.com/browse/COST-935
  ros = 'cost-management.ui.ros', // ROS support https://issues.redhat.com/browse/COST-3477
}

// The FeatureFlags component saves feature flags in store for places where Unleash hooks not available
const useFeatureFlags = () => {
  const updateContext = useUnleashContext();
  const client = useUnleashClient();
  const dispatch = useDispatch();

  const fetchUser = callback => {
    const insights = (window as any).insights;
    if (insights && insights.chrome && insights.chrome.auth && insights.chrome.auth.getUser) {
      insights.chrome.auth.getUser().then(user => {
        callback(user.identity.account_number);
      });
    }
  };

  const isMounted = useRef(false);
  useLayoutEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update everytime or flags may be false
  useLayoutEffect(() => {
    fetchUser(userId => {
      if (isMounted.current) {
        updateContext({
          userId,
        });
      }
    });
  });

  useLayoutEffect(() => {
    // Wait for the new flags to pull in from the different context
    const fetchFlags = async userId => {
      await updateContext({ userId }).then(() => {
        dispatch(
          featureFlagsActions.setFeatureFlags({
            isCostDistributionFeatureEnabled: client.isEnabled(FeatureToggle.costDistribution),
            isExportsFeatureEnabled: client.isEnabled(FeatureToggle.exports),
            isFinsightsFeatureEnabled: client.isEnabled(FeatureToggle.finsights),
            isIbmFeatureEnabled: client.isEnabled(FeatureToggle.ibm),
            isRosFeatureEnabled: client.isEnabled(FeatureToggle.ros),
          })
        );
      });
    };
    fetchUser(userId => {
      if (isMounted.current) {
        fetchFlags(userId);
      }
    });
  });
};

export default useFeatureFlags;
