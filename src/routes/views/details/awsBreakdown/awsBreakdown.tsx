import { ProviderType } from 'api/providers';
import { getQuery, parseQuery } from 'api/queries/awsQuery';
import { getProvidersQuery } from 'api/queries/providersQuery';
import type { Query } from 'api/queries/query';
import { ReportPathsType, ReportType } from 'api/reports/report';
import { TagPathsType } from 'api/tags/tag';
import messages from 'locales/messages';
import React from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { routes } from 'routes';
import type { BreakdownStateProps } from 'routes/views/details/components/breakdown';
import { BreakdownBase } from 'routes/views/details/components/breakdown';
import { getGroupById, getGroupByOrgValue, getGroupByValue } from 'routes/views/utils/groupBy';
import { filterProviders } from 'routes/views/utils/providers';
import { createMapStateToProps } from 'store/common';
import { providersQuery, providersSelectors } from 'store/providers';
import { reportActions, reportSelectors } from 'store/reports';
import { getCostType } from 'utils/costType';
import { getCurrency } from 'utils/localStorage';
import { formatPath } from 'utils/paths';
import { breakdownDescKey, breakdownTitleKey, logicalAndPrefix, orgUnitIdKey } from 'utils/props';
import type { RouterComponentProps } from 'utils/router';
import { withRouter } from 'utils/router';

import { CostOverview } from './costOverview';
import { HistoricalData } from './historicalData';

interface BreakdownDispatchProps {
  fetchReport?: typeof reportActions.fetchReport;
}

type AwsBreakdownOwnProps = RouterComponentProps & WrappedComponentProps;

const detailsURL = formatPath(routes.awsDetails.path);
const reportType = ReportType.cost;
const reportPathsType = ReportPathsType.aws;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapStateToProps = createMapStateToProps<AwsBreakdownOwnProps, BreakdownStateProps>((state, { intl, router }) => {
  const queryFromRoute = parseQuery<Query>(router.location.search);
  const groupByOrgValue = getGroupByOrgValue(queryFromRoute);
  const groupBy = groupByOrgValue ? orgUnitIdKey : getGroupById(queryFromRoute);
  const groupByValue = groupByOrgValue ? groupByOrgValue : getGroupByValue(queryFromRoute);
  const costType = getCostType();
  const currency = getCurrency();

  const newQuery: Query = {
    filter: {
      resolution: 'monthly',
      time_scope_units: 'month',
      time_scope_value: -1,
    },
    filter_by: {
      // Add filters here to apply logical OR/AND
      ...(queryFromRoute && queryFromRoute.filter_by && queryFromRoute.filter_by),
      ...(queryFromRoute &&
        queryFromRoute.filter &&
        queryFromRoute.filter.account && { [`${logicalAndPrefix}account`]: queryFromRoute.filter.account }),
    },
    exclude: {
      ...(queryFromRoute && queryFromRoute.exclude && queryFromRoute.exclude),
    },
    group_by: {
      ...(groupBy && { [groupBy]: groupByValue }),
    },
  };

  const reportQueryString = getQuery({
    ...newQuery,
    cost_type: costType,
    currency,
    filter_by: {
      ...newQuery.filter_by,
      // Omit filters associated with the current group_by -- see https://issues.redhat.com/browse/COST-1131 and https://issues.redhat.com/browse/COST-3642
      ...(groupBy && groupByValue !== '*' && { [groupBy]: undefined }),
    },
  });
  const report = reportSelectors.selectReport(state, reportPathsType, reportType, reportQueryString);
  const reportError = reportSelectors.selectReportError(state, reportPathsType, reportType, reportQueryString);
  const reportFetchStatus = reportSelectors.selectReportFetchStatus(
    state,
    reportPathsType,
    reportType,
    reportQueryString
  );

  const providersQueryString = getProvidersQuery(providersQuery);
  const providers = providersSelectors.selectProviders(state, ProviderType.all, providersQueryString);
  const providersError = providersSelectors.selectProvidersError(state, ProviderType.all, providersQueryString);
  const providersFetchStatus = providersSelectors.selectProvidersFetchStatus(
    state,
    ProviderType.all,
    providersQueryString
  );

  const title = queryFromRoute[breakdownTitleKey] ? queryFromRoute[breakdownTitleKey] : groupByValue;

  return {
    costOverviewComponent: (
      <CostOverview costType={costType} currency={currency} groupBy={groupBy} query={queryFromRoute} report={report} />
    ),
    costType,
    currency,
    description: queryFromRoute[breakdownDescKey],
    detailsURL,
    emptyStateTitle: intl.formatMessage(messages.awsDetailsTitle),
    groupBy,
    groupByValue,
    historicalDataComponent: <HistoricalData costType={costType} currency={currency} />,
    providers: filterProviders(providers, ProviderType.aws),
    providersError,
    providersFetchStatus,
    providerType: ProviderType.aws,
    query: queryFromRoute,
    report,
    reportError,
    reportFetchStatus,
    reportType,
    reportPathsType,
    reportQueryString,
    showCostType: true,
    tagReportPathsType: TagPathsType.aws,
    title,
  };
});

const mapDispatchToProps: BreakdownDispatchProps = {
  fetchReport: reportActions.fetchReport,
};

const AwsBreakdown = injectIntl(withRouter(connect(mapStateToProps, mapDispatchToProps)(BreakdownBase)));

export default AwsBreakdown;
