import { PageSection, Pagination, PaginationVariant } from '@patternfly/react-core';
import type { Query } from 'api/queries/query';
import { getQuery } from 'api/queries/query';
import type { Settings } from 'api/settings';
import type { SettingsData } from 'api/settings';
import { SettingsType } from 'api/settings';
import type { AxiosError } from 'axios';
import messages from 'locales/messages';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { Loading } from 'routes/components/page/loading';
import { NotAvailable } from 'routes/components/page/notAvailable';
import * as queryUtils from 'routes/utils/query';
import type { RootState } from 'store';
import { FetchStatus } from 'store/common';
import { settingsActions, settingsSelectors } from 'store/settings';
import { useStateCallback } from 'utils/hooks';

import { styles } from './costCategory.styles';
import { CostCategoryTable } from './costCategoryTable';
import { CostCategoryToolbar } from './costCategoryToolbar';

interface CostCategoryOwnProps {
  canWrite?: boolean;
}

export interface CostCategoryMapProps {
  query?: Query;
}

export interface CostCategoryStateProps {
  settings?: Settings;
  settingsError?: AxiosError;
  settingsStatus?: FetchStatus;
  settingsQueryString?: string;
}

type CostCategoryProps = CostCategoryOwnProps;

const baseQuery: Query = {
  limit: 10,
  offset: 0,
  filter_by: {},
  order_by: {
    key: 'asc',
  },
};

const CostCategory: React.FC<CostCategoryProps> = ({ canWrite }) => {
  const [query, setQuery] = useState({ ...baseQuery });
  const [selectedItems, setSelectedItems] = useStateCallback([]);
  const dispatch: ThunkDispatch<RootState, any, AnyAction> = useDispatch();
  const intl = useIntl();

  const { settings, settingsError, settingsStatus } = useMapToProps({ query });

  const getCategories = () => {
    if (settings) {
      return settings.data as any;
    }
    return [];
  };

  const getPagination = (isDisabled = false, isBottom = false) => {
    const count = settings?.meta ? settings.meta.count : 0;
    const limit = settings?.meta ? settings.meta.limit : baseQuery.limit;
    const offset = settings?.meta ? settings.meta.offset : baseQuery.offset;
    const page = Math.trunc(offset / limit + 1);

    return (
      <Pagination
        isCompact={!isBottom}
        isDisabled={isDisabled}
        itemCount={count}
        onPerPageSelect={(event, perPage) => handleOnPerPageSelect(perPage)}
        onSetPage={(event, pageNumber) => handleOnSetPage(pageNumber)}
        page={page}
        perPage={limit}
        titles={{
          paginationAriaLabel: intl.formatMessage(messages.paginationTitle, {
            title: intl.formatMessage(messages.openShift),
            placement: isBottom ? 'bottom' : 'top',
          }),
        }}
        variant={isBottom ? PaginationVariant.bottom : PaginationVariant.top}
        widgetId={`exports-pagination${isBottom ? '-bottom' : ''}`}
      />
    );
  };

  const getTable = () => {
    return (
      <CostCategoryTable
        canWrite={canWrite}
        filterBy={query.filter_by}
        isLoading={settingsStatus === FetchStatus.inProgress}
        orderBy={query.order_by}
        onSelected={handleOnSelected}
        onSort={(sortType, isSortAscending) => handleOnSort(sortType, isSortAscending)}
        settings={settings}
        selectedItems={selectedItems}
      />
    );
  };

  const getToolbar = (categories: SettingsData[]) => {
    const hasEnabledItem = selectedItems.find(item => item.enabled);
    const hasDisabledItem = selectedItems.find(item => !item.enabled);
    const itemsTotal = settings?.meta ? settings.meta.count : 0;

    return (
      <CostCategoryToolbar
        canWrite={canWrite}
        isDisabled={categories.length === 0}
        isPrimaryActionDisabled={!hasDisabledItem}
        isSecondaryActionDisabled={!hasEnabledItem}
        itemsPerPage={categories.length}
        itemsTotal={itemsTotal}
        onBulkSelected={handleOnBulkSelected}
        onDisableTags={handleOnDisableCategories}
        onEnableTags={handleOnEnableCategories}
        onFilterAdded={filter => handleOnFilterAdded(filter)}
        onFilterRemoved={filter => handleOnFilterRemoved(filter)}
        pagination={getPagination(isDisabled)}
        query={query}
        selectedItems={selectedItems}
        showBulkSelectAll={false}
      />
    );
  };

  const handleOnBulkSelected = (action: string) => {
    if (action === 'none') {
      setSelectedItems([]);
    } else if (action === 'page') {
      const newSelectedItems = [...selectedItems];
      getCategories().map(val => {
        if (!newSelectedItems.find(item => item.uuid === val.uuid)) {
          newSelectedItems.push(val);
        }
      });
      setSelectedItems(newSelectedItems);
    }
  };

  const handleOnDisableCategories = () => {
    if (selectedItems.length > 0) {
      setSelectedItems([], () => {
        dispatch(
          settingsActions.updateSettings(SettingsType.awsCategoryKeysDisable, {
            ids: selectedItems.map(item => item.uuid),
          })
        );
      });
    }
  };

  const handleOnEnableCategories = () => {
    if (selectedItems.length > 0) {
      setSelectedItems([], () => {
        dispatch(
          settingsActions.updateSettings(SettingsType.awsCategoryKeysEnable, {
            ids: selectedItems.map(item => item.uuid),
          })
        );
      });
    }
  };

  const handleOnFilterAdded = filter => {
    const newQuery = queryUtils.handleOnFilterAdded(query, filter);
    setQuery(newQuery);
  };

  const handleOnFilterRemoved = filter => {
    const newQuery = queryUtils.handleOnFilterRemoved(query, filter);
    setQuery(newQuery);
  };

  const handleOnPerPageSelect = perPage => {
    const newQuery = queryUtils.handleOnPerPageSelect(query, perPage, true);
    setQuery(newQuery);
  };

  const handleOnSetPage = pageNumber => {
    const newQuery = queryUtils.handleOnSetPage(query, settings, pageNumber, true);
    setQuery(newQuery);
  };

  const handleOnSelected = (items: SettingsData[], isSelected: boolean = false) => {
    let newItems = [...selectedItems];
    if (items && items.length > 0) {
      if (isSelected) {
        items.map(item => newItems.push(item));
      } else {
        items.map(item => {
          newItems = newItems.filter(val => val.uuid !== item.uuid);
        });
      }
    }
    setSelectedItems(newItems);
  };

  const handleOnSort = (sortType, isSortAscending) => {
    const newQuery = queryUtils.handleOnSort(query, sortType, isSortAscending);
    setQuery(newQuery);
  };

  const categories = getCategories();
  const isDisabled = categories.length === 0;

  if (settingsError) {
    return <NotAvailable />;
  }
  return (
    <PageSection isFilled>
      <div style={styles.descContainer}>
        {intl.formatMessage(messages.costCategoryDesc, {
          learnMore: (
            <a href={intl.formatMessage(messages.docsConfigCostCategory)} rel="noreferrer" target="_blank">
              {intl.formatMessage(messages.learnMore)}
            </a>
          ),
        })}
      </div>
      {getToolbar(categories)}
      {settingsStatus === FetchStatus.inProgress ? (
        <Loading />
      ) : (
        <>
          {getTable()}
          <div style={styles.pagination}>{getPagination(isDisabled, true)}</div>
        </>
      )}
    </PageSection>
  );
};

// eslint-disable-next-line no-empty-pattern
const useMapToProps = ({ query }: CostCategoryMapProps): CostCategoryStateProps => {
  const dispatch: ThunkDispatch<RootState, any, AnyAction> = useDispatch();

  const settingsQuery = {
    filter_by: query.filter_by,
    limit: query.limit,
    offset: query.offset,
    order_by: query.order_by,
  };
  const settingsQueryString = getQuery(settingsQuery);
  const settings = useSelector((state: RootState) =>
    settingsSelectors.selectSettings(state, SettingsType.awsCategoryKeys, settingsQueryString)
  );
  const settingsStatus = useSelector((state: RootState) =>
    settingsSelectors.selectSettingsStatus(state, SettingsType.awsCategoryKeys, settingsQueryString)
  );
  const settingsError = useSelector((state: RootState) =>
    settingsSelectors.selectSettingsError(state, SettingsType.awsCategoryKeys, settingsQueryString)
  );

  const settingsUpdateDisableStatus = useSelector((state: RootState) =>
    settingsSelectors.selectSettingsUpdateStatus(state, SettingsType.awsCategoryKeysDisable)
  );
  const settingsUpdateEnableStatus = useSelector((state: RootState) =>
    settingsSelectors.selectSettingsUpdateStatus(state, SettingsType.awsCategoryKeysEnable)
  );

  useEffect(() => {
    if (
      !settingsError &&
      settingsStatus !== FetchStatus.inProgress &&
      settingsUpdateDisableStatus !== FetchStatus.inProgress &&
      settingsUpdateEnableStatus !== FetchStatus.inProgress
    ) {
      dispatch(settingsActions.fetchSettings(SettingsType.awsCategoryKeys, settingsQueryString));
    }
  }, [query, settingsUpdateDisableStatus, settingsUpdateEnableStatus]);

  return {
    settings,
    settingsError,
    settingsStatus,
    settingsQueryString,
  };
};

export default CostCategory;
