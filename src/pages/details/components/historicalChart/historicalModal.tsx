import { Modal } from '@patternfly/react-core';
import { getQuery, Query } from 'api/queries/query';
import { ReportPathsType } from 'api/reports/report';
import React from 'react';
import { InjectedTranslateProps, translate } from 'react-i18next';
import { connect } from 'react-redux';
import { createMapStateToProps } from 'store/common';
import { ComputedReportItem } from 'utils/computedReport/getComputedReportItems';
import { HistoricalChart } from './historicalChart';
import { modalOverride } from './historicalModal.styles';

interface HistoricalCloudModalOwnProps {
  groupBy: string;
  isOpen: boolean;
  item: ComputedReportItem;
  onClose(isOpen: boolean);
  reportPathsType: ReportPathsType;
}

interface HistoricalCloudModalStateProps {
  currentQueryString: string;
  previousQueryString: string;
}

type HistoricalCloudModalProps = HistoricalCloudModalOwnProps &
  HistoricalCloudModalStateProps &
  InjectedTranslateProps;

class HistoricalCloudModalBase extends React.Component<
  HistoricalCloudModalProps
> {
  constructor(props: HistoricalCloudModalProps) {
    super(props);
    this.handleClose = this.handleClose.bind(this);
  }

  public componentDidMount() {
    this.setState({});
  }

  public shouldComponentUpdate(nextProps: HistoricalCloudModalProps) {
    const { isOpen, item } = this.props;
    return nextProps.item !== item || nextProps.isOpen !== isOpen;
  }

  private handleClose = () => {
    this.props.onClose(false);
  };

  public render() {
    const {
      currentQueryString,
      groupBy,
      isOpen,
      item,
      previousQueryString,
      reportPathsType,
      t,
    } = this.props;

    return (
      <Modal
        className={modalOverride}
        isLarge
        isOpen={isOpen}
        onClose={this.handleClose}
        title={t('details.historical.modal_title', {
          groupBy,
          name: item.label,
        })}
      >
        <HistoricalChart
          currentQueryString={currentQueryString}
          previousQueryString={previousQueryString}
          reportPathsType={reportPathsType}
        />
      </Modal>
    );
  }
}

const mapStateToProps = createMapStateToProps<
  HistoricalCloudModalOwnProps,
  HistoricalCloudModalStateProps
>((state, { groupBy, item }) => {
  const currentQuery: Query = {
    filter: {
      time_scope_units: 'month',
      time_scope_value: -1,
      resolution: 'daily',
      limit: 3,
    },
    group_by: {
      [groupBy]: item.label || item.id,
    },
  };
  const currentQueryString = getQuery(currentQuery);
  const previousQuery: Query = {
    filter: {
      time_scope_units: 'month',
      time_scope_value: -2,
      resolution: 'daily',
      limit: 3,
    },
    group_by: {
      [groupBy]: item.label || item.id,
    },
  };
  const previousQueryString = getQuery(previousQuery);
  return {
    currentQueryString,
    previousQueryString,
  };
});

const HistoricalModal = translate()(
  connect(mapStateToProps, {})(HistoricalCloudModalBase)
);

export { HistoricalModal };
