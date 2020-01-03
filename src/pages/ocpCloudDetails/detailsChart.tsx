import { ChartBullet } from '@patternfly/react-charts';
import { css } from '@patternfly/react-styles';
import {
  Skeleton,
  SkeletonSize,
} from '@redhat-cloud-services/frontend-components/components/Skeleton';
import { getQuery, OcpCloudQuery } from 'api/ocpCloudQuery';
import { OcpCloudReport, OcpCloudReportType } from 'api/ocpCloudReports';
import React from 'react';
import { InjectedTranslateProps, translate } from 'react-i18next';
import { connect } from 'react-redux';
import { createMapStateToProps, FetchStatus } from 'store/common';
import {
  ocpCloudReportsActions,
  ocpCloudReportsSelectors,
} from 'store/ocpCloudReports';
import { unitLookupKey } from 'utils/formatValue';
import { ComputedOcpCloudReportItem } from 'utils/getComputedOcpCloudReportItems';
import { styles } from './detailsChart.styles';

export interface ChartDatum {
  legend: any[];
  limit: any;
  ranges: any[];
  usage: any[];
}

interface DetailsChartOwnProps {
  groupBy: string;
  item: ComputedOcpCloudReportItem;
}

interface DetailsChartStateProps {
  cpuReport?: OcpCloudReport;
  cpuReportFetchStatus?: FetchStatus;
  memoryReport?: OcpCloudReport;
  memoryReportFetchStatus?: FetchStatus;
  queryString?: string;
}

interface DetailsChartDispatchProps {
  fetchReport?: typeof ocpCloudReportsActions.fetchReport;
}

interface State {
  width: number;
}

type DetailsChartProps = DetailsChartOwnProps &
  DetailsChartStateProps &
  DetailsChartDispatchProps &
  InjectedTranslateProps;

const cpuReportType = OcpCloudReportType.cpu;
const memoryReportType = OcpCloudReportType.memory;

class DetailsChartBase extends React.Component<DetailsChartProps> {
  private containerRef = React.createRef<HTMLDivElement>();
  public state: State = {
    width: 0,
  };

  public componentDidMount() {
    const { fetchReport, queryString } = this.props;
    fetchReport(cpuReportType, queryString);
    fetchReport(memoryReportType, queryString);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  public componentDidUpdate(prevProps: DetailsChartProps) {
    const { fetchReport, queryString } = this.props;
    if (prevProps.queryString !== this.props.queryString) {
      fetchReport(cpuReportType, queryString);
      fetchReport(memoryReportType, queryString);
    }
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (this.containerRef.current && this.containerRef.current.clientWidth) {
      this.setState({ width: this.containerRef.current.clientWidth });
    }
  };

  private getChartDatum(report: OcpCloudReport, labelKey: string): ChartDatum {
    const { t } = this.props;
    const datum: ChartDatum = {
      legend: [],
      limit: {},
      ranges: [],
      usage: [],
    };

    // Always show bullet chart legends https://github.com/project-koku/koku-ui/issues/963
    const hasTotal = report && report.meta && report.meta.total;

    const hasLimit = hasTotal && report.meta.total.limit;
    const limit = Math.trunc(hasLimit ? report.meta.total.limit.value : 0);
    const limitUnits = t(
      `units.${unitLookupKey(hasLimit ? report.meta.total.limit.units : '')}`
    );
    datum.limit = {
      legend: t(`ocp_cloud_details.bullet.${labelKey}_limit`, {
        value: limit,
        units: limitUnits,
      }),
      tooltip: t(`ocp_cloud_details.bullet.${labelKey}_limit`, {
        value: limit,
        units: limitUnits,
      }),
      value: Math.trunc(limit),
    };

    const hasRequest = hasTotal && report.meta.total.request;
    const request = Math.trunc(
      hasRequest ? report.meta.total.request.value : 0
    );
    const requestUnits = t(
      `units.${unitLookupKey(
        hasRequest ? report.meta.total.request.units : ''
      )}`
    );
    datum.ranges = [
      {
        legend: t(`ocp_cloud_details.bullet.${labelKey}_requests`, {
          value: request,
          units: requestUnits,
        }),
        tooltip: t(`ocp_cloud_details.bullet.${labelKey}_requests`, {
          value: request,
          units: requestUnits,
        }),
        value: Math.trunc(request),
      },
    ];

    const hasUsage = hasTotal && report.meta.total.usage;
    const usage = Math.trunc(hasUsage ? report.meta.total.usage.value : 0);
    const usageUnits = t(
      `units.${unitLookupKey(hasUsage ? report.meta.total.usage.units : '')}`
    );
    datum.usage = [
      {
        legend: t(`ocp_cloud_details.bullet.${labelKey}_usage`, {
          value: usage,
          units: usageUnits,
        }),
        tooltip: t(`ocp_cloud_details.bullet.${labelKey}_usage`, {
          value: usage,
          units: usageUnits,
        }),
        value: Math.trunc(usage),
      },
    ];
    return datum;
  }

  private getSkeleton = () => {
    return (
      <>
        <Skeleton
          className={css(styles.chartSkeleton)}
          size={SkeletonSize.md}
        />
        <Skeleton
          className={css(styles.legendSkeleton)}
          size={SkeletonSize.xs}
        />
      </>
    );
  };

  public render() {
    const {
      cpuReport,
      cpuReportFetchStatus,
      memoryReport,
      memoryReportFetchStatus,
      t,
    } = this.props;
    const { width } = this.state;
    const cpuDatum = this.getChartDatum(cpuReport, 'cpu');
    const memoryDatum = this.getChartDatum(memoryReport, 'memory');
    const itemsPerRow = width > 600 ? 3 : width > 450 ? 2 : 1;

    return (
      <div ref={this.containerRef}>
        {Boolean(cpuDatum && cpuDatum.usage.length) && (
          <div>
            {cpuReportFetchStatus === FetchStatus.inProgress ? (
              this.getSkeleton()
            ) : (
              <ChartBullet
                comparativeErrorMeasureData={
                  cpuDatum.limit.value
                    ? [
                        {
                          tooltip: cpuDatum.limit.tooltip,
                          y: cpuDatum.limit.value,
                        },
                      ]
                    : []
                }
                comparativeErrorMeasureLegendData={
                  cpuDatum.limit.value ? [{ name: cpuDatum.limit.legend }] : []
                }
                height={200}
                labels={({ datum }) => `${datum.tooltip}`}
                legendPosition="bottom-left"
                legendItemsPerRow={itemsPerRow}
                padding={{
                  bottom: 75,
                  left: 10,
                  right: 50,
                  top: 50,
                }}
                primarySegmentedMeasureData={
                  cpuDatum.usage.length
                    ? [
                        {
                          tooltip: cpuDatum.usage[0].tooltip,
                          y: cpuDatum.usage[0].value,
                        },
                      ]
                    : []
                }
                primarySegmentedMeasureLegendData={
                  cpuDatum.usage.length
                    ? [{ name: cpuDatum.usage[0].legend }]
                    : []
                }
                qualitativeRangeData={
                  cpuDatum.ranges.length
                    ? [
                        {
                          tooltip: cpuDatum.ranges[0].tooltip,
                          y: cpuDatum.ranges[0].value,
                        },
                      ]
                    : []
                }
                qualitativeRangeLegendData={
                  cpuDatum.ranges.length
                    ? [{ name: cpuDatum.ranges[0].legend }]
                    : []
                }
                title={t('ocp_details.bullet.cpu_label')}
                titlePosition="top-left"
                width={width}
              />
            )}
          </div>
        )}
        {Boolean(memoryDatum && memoryDatum.usage.length) && (
          <div>
            {memoryReportFetchStatus === FetchStatus.inProgress ? (
              this.getSkeleton()
            ) : (
              <ChartBullet
                comparativeErrorMeasureData={
                  memoryDatum.limit.value
                    ? [
                        {
                          tooltip: memoryDatum.limit.tooltip,
                          y: memoryDatum.limit.value,
                        },
                      ]
                    : []
                }
                comparativeErrorMeasureLegendData={
                  memoryDatum.limit.value
                    ? [{ name: memoryDatum.limit.legend }]
                    : []
                }
                height={200}
                labels={({ datum }) => `${datum.tooltip}`}
                legendPosition="bottom-left"
                legendItemsPerRow={itemsPerRow}
                padding={{
                  bottom: 75,
                  left: 10,
                  right: 50,
                  top: 50,
                }}
                primarySegmentedMeasureData={
                  memoryDatum.usage.length
                    ? [
                        {
                          tooltip: memoryDatum.usage[0].tooltip,
                          y: memoryDatum.usage[0].value,
                        },
                      ]
                    : []
                }
                primarySegmentedMeasureLegendData={
                  memoryDatum.usage.length
                    ? [{ name: memoryDatum.usage[0].legend }]
                    : []
                }
                qualitativeRangeData={
                  memoryDatum.ranges.length
                    ? [
                        {
                          tooltip: memoryDatum.ranges[0].tooltip,
                          y: memoryDatum.ranges[0].value,
                        },
                      ]
                    : []
                }
                qualitativeRangeLegendData={
                  memoryDatum.ranges.length
                    ? [{ name: memoryDatum.ranges[0].legend }]
                    : []
                }
                title={t('ocp_details.bullet.memory_label')}
                titlePosition="top-left"
                width={width}
              />
            )}
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = createMapStateToProps<
  DetailsChartOwnProps,
  DetailsChartStateProps
>((state, { groupBy, item }) => {
  const query: OcpCloudQuery = {
    filter: {
      time_scope_units: 'month',
      time_scope_value: -1,
      resolution: 'monthly',
      limit: 3,
    },
    group_by: {
      [groupBy]: item.label || item.id,
    },
  };
  const queryString = getQuery(query);
  const cpuReport = ocpCloudReportsSelectors.selectReport(
    state,
    cpuReportType,
    queryString
  );
  const cpuReportFetchStatus = ocpCloudReportsSelectors.selectReportFetchStatus(
    state,
    cpuReportType,
    queryString
  );
  const memoryReport = ocpCloudReportsSelectors.selectReport(
    state,
    memoryReportType,
    queryString
  );
  const memoryReportFetchStatus = ocpCloudReportsSelectors.selectReportFetchStatus(
    state,
    memoryReportType,
    queryString
  );
  return {
    cpuReport,
    cpuReportFetchStatus,
    memoryReport,
    memoryReportFetchStatus,
    queryString,
  };
});

const mapDispatchToProps: DetailsChartDispatchProps = {
  fetchReport: ocpCloudReportsActions.fetchReport,
};

const DetailsChart = translate()(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(DetailsChartBase)
);

export { DetailsChart, DetailsChartProps };
