import { helper } from '@appbaseio/reactivecore';

const { getAggsOrder } = helper;

const extractQuery = (defaultQuery) => {
	const queryToBeReturned = {};
	if (defaultQuery) {
		const evaluateQuery = defaultQuery();
		if (evaluateQuery) {
			if (evaluateQuery.query) {
				queryToBeReturned.query = evaluateQuery.query;
			}
			if (evaluateQuery.aggs) {
				queryToBeReturned.aggs = evaluateQuery.aggs;
			}
		}
	}
	return queryToBeReturned;
};
const getAggsQuery = (query, props) => {
	const clonedQuery = query;
	const {
		dataField, size, sortBy, showMissing, missingLabel,
	} = props;
	clonedQuery.size = 0;
	clonedQuery.aggs = {
		[dataField]: {
			terms: {
				field: dataField,
				size,
				order: getAggsOrder(sortBy || 'count'),
				...(showMissing ? { missing: missingLabel } : {}),
			},
		},
	};

	if (props.nestedField) {
		clonedQuery.aggs = {
			reactivesearch_nested: {
				nested: {
					path: props.nestedField,
				},
				aggs: clonedQuery.aggs
			},
		};
	}
	return { ...clonedQuery, ...extractQuery(props.defaultQuery) };
};

const getCompositeAggsQuery = (query, props, after) => {
	const clonedQuery = query;
	// missing label not available in composite aggs
	const {
		dataField, size, sortBy, showMissing,
	} = props;

	// composite aggs only allows asc and desc
	const order = sortBy === 'count' ? {} : { order: sortBy };

	clonedQuery.aggs = {
		[dataField]: {
			composite: {
				sources: [
					{
						[dataField]: {
							terms: {
								field: dataField,
								...order,
								...(showMissing ? { missing_bucket: true } : {}),
							},
						},
					},
				],
				size,
				...after,
			},
		},
	};
	clonedQuery.size = 0;

	if (props.nestedField) {
		clonedQuery.aggs = {
			reactivesearch_nested: {
				nested: {
					path: props.nestedField,
				},
				aggs: clonedQuery.aggs
			},
		};
	}
	return { ...clonedQuery, ...extractQuery(props.defaultQuery) };
};

export { getAggsQuery, getCompositeAggsQuery };
