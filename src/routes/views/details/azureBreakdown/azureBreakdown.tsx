import type { Providers } from 'api/providers';
import { ProviderType } from 'api/providers';
import type { OcpQuery } from 'api/queries/ocpQuery';
import { getQuery, parseQuery } from 'api/queries/ocpQuery';
import { getProvidersQuery } from 'api/queries/providersQuery';
import type { Query } from 'api/queries/query';
import { breakdownDescKey } from 'api/queries/query';
import type { Report } from 'api/reports/report';
import { ReportPathsType, ReportType } from 'api/reports/report';
import { TagPathsType } from 'api/tags/tag';
import { AxiosError } from 'axios';
import messages from 'locales/messages';
import React from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { paths } from 'routes';
import { BreakdownBase } from 'routes/views/details/components/breakdown';
import { getGroupById, getGroupByValue } from 'routes/views/utils/groupBy';
import { filterProviders } from 'routes/views/utils/providers';
import { createMapStateToProps, FetchStatus } from 'store/common';
import { featureFlagsSelectors } from 'store/featureFlags';
import { providersQuery, providersSelectors } from 'store/providers';
import { reportActions, reportSelectors } from 'store/reports';
import { getCurrency } from 'utils/currency';

import { CostOverview } from './costOverview';
import { HistoricalData } from './historicalData';

type AzureCostOwnProps = WrappedComponentProps;

interface AzureCostStateProps {
  CostOverview?: React.ReactNode;
  currency?: string;
  detailsURL: string;
  HistoricalData?: React.ReactNode;
  providers: Providers;
  providersError: AxiosError;
  providersFetchStatus: FetchStatus;
  query: Query;
  queryString: string;
  report: Report;
  reportError: AxiosError;
  reportFetchStatus: FetchStatus;
  reportType: ReportType;
  reportPathsType: ReportPathsType;
}

interface AzureCostDispatchProps {
  fetchReport?: typeof reportActions.fetchReport;
}

const detailsURL = paths.azureDetails;
const reportType = ReportType.cost;
const reportPathsType = ReportPathsType.azure;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapStateToProps = createMapStateToProps<AzureCostOwnProps, AzureCostStateProps>((state, props) => {
  const query = parseQuery<OcpQuery>(location.search);
  const groupBy = getGroupById(query);
  const groupByValue = getGroupByValue(query);
  const currency = featureFlagsSelectors.selectIsCurrencyFeatureEnabled(state) ? getCurrency() : undefined;

  const newQuery: Query = {
    filter: {
      resolution: 'monthly',
      time_scope_units: 'month',
      time_scope_value: -1,
    },
    filter_by: {
      // Add filters here to apply logical OR/AND
      ...(query && query.filter_by && query.filter_by),
      ...(groupBy && { [groupBy]: undefined }), // Omit filters associated with the current group_by -- see https://issues.redhat.com/browse/COST-1131
    },
    group_by: {
      ...(groupBy && { [groupBy]: groupByValue }),
    },
    currency,
  };
  const queryString = getQuery(newQuery);

  const report = reportSelectors.selectReport(state, reportPathsType, reportType, queryString);
  const reportError = reportSelectors.selectReportError(state, reportPathsType, reportType, queryString);
  const reportFetchStatus = reportSelectors.selectReportFetchStatus(state, reportPathsType, reportType, queryString);

  const providersQueryString = getProvidersQuery(providersQuery);
  const providers = providersSelectors.selectProviders(state, ProviderType.all, providersQueryString);
  const providersError = providersSelectors.selectProvidersError(state, ProviderType.all, providersQueryString);
  const providersFetchStatus = providersSelectors.selectProvidersFetchStatus(
    state,
    ProviderType.all,
    providersQueryString
  );

  return {
    costOverviewComponent: <CostOverview currency={currency} groupBy={groupBy} report={report} />,
    currency,
    description: query[breakdownDescKey],
    detailsURL,
    emptyStateTitle: props.intl.formatMessage(messages.azureDetailsTitle),
    groupBy,
    groupByValue,
    historicalDataComponent: <HistoricalData currency={currency} />,
    providers: filterProviders(providers, ProviderType.azure),
    providersError,
    providersFetchStatus,
    providerType: ProviderType.azure,
    query,
    queryString,
    report,
    reportError,
    reportFetchStatus,
    reportType,
    reportPathsType,
    tagReportPathsType: TagPathsType.azure,
    title: groupByValue,
  };
});

const mapDispatchToProps: AzureCostDispatchProps = {
  fetchReport: reportActions.fetchReport,
};

const AzureCost = injectIntl(connect(mapStateToProps, mapDispatchToProps)(BreakdownBase));

export default AzureCost;
