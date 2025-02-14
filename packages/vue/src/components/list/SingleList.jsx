import { Actions, helper } from '@appbaseio/reactivecore';
import VueTypes from 'vue-types';
import Title from '../../styles/Title';
import Input from '../../styles/Input';
import Container from '../../styles/Container';
import { connect, isFunction } from '../../utils/index';
import types from '../../utils/vueTypes';
import { UL, Radio } from '../../styles/FormControlList';
import { getAggsQuery } from './utils';
import { deprecatePropWarning } from '../shared/utils';
import { isEqual } from '@appbaseio/reactivecore/lib/utils/helper';

const {
	addComponent,
	removeComponent,
	watchComponent,
	updateQuery,
	setQueryOptions,
	setQueryListener,
} = Actions;
const {
	getQueryOptions,
	pushToAndClause,
	checkValueChange,
	getClassName,
	getOptionsFromQuery,
} = helper;

const SingleList = {
	name: 'SingleList',
	props: {
		beforeValueChange: types.func,
		className: types.string.def(''),
		componentId: types.stringRequired,
		customQuery: types.func,
		dataField: types.stringRequired,
		defaultSelected: types.string,
		defaultValue: types.string,
		value: types.value,
		defaultQuery: types.func,
		filterLabel: types.string,
		innerClass: types.style,
		placeholder: VueTypes.string.def('Search'),
		react: types.react,
		renderItem: types.func,
		transformData: types.func,
		selectAllLabel: types.string,
		showCount: VueTypes.bool.def(true),
		showFilter: VueTypes.bool.def(true),
		showRadio: VueTypes.bool.def(true),
		showSearch: VueTypes.bool.def(true),
		size: VueTypes.number.def(100),
		sortBy: VueTypes.oneOf(['asc', 'desc', 'count']).def('count'),
		title: types.title,
		URLParams: VueTypes.bool.def(false),
		showMissing: VueTypes.bool.def(false),
		missingLabel: VueTypes.string.def('N/A'),
		nestedField: types.string,
	},
	data() {
		const props = this.$props;
		this.__state = {
			currentValue: '',
			modifiedOptions:
				props.options && props.options[props.dataField]
					? props.options[props.dataField].buckets
					: [],
			searchTerm: '',
		};
		this.locked = false;
		this.internalComponent = `${props.componentId}__internal`;
		return this.__state;
	},
	created() {
		const onQueryChange = (...args) => {
			this.$emit('queryChange', ...args);
		};
		this.setQueryListener(this.$props.componentId, onQueryChange, e => {
			this.$emit('error', e);
		});
	},
	beforeMount() {
		this.addComponent(this.internalComponent);
		this.addComponent(this.$props.componentId);
		this.updateQueryHandlerOptions(this.$props);
		this.setReact(this.$props);

		if (this.selectedValue) {
			this.setValue(this.selectedValue);
		} else if (this.$props.value) {
			this.setValue(this.$props.value);
		} else if (this.$props.defaultValue) {
			this.setValue(this.$props.defaultValue);
		} else if (this.$props.defaultSelected) {
			/* TODO: Remove this before next release */
			deprecatePropWarning('defaultSelected', 'defaultValue');
			this.setValue(this.$props.defaultSelected);
		}
	},

	beforeDestroy() {
		this.removeComponent(this.$props.componentId);
		this.removeComponent(this.internalComponent);
	},
	watch: {
		react() {
			this.setReact(this.$props);
		},
		options(newVal) {
			this.modifiedOptions = newVal[this.$props.dataField]
				? newVal[this.$props.dataField].buckets
				: [];
		},
		size() {
			this.updateQueryHandlerOptions(this.$props);
		},
		sortBy() {
			this.updateQueryHandlerOptions(this.$props);
		},
		dataField() {
			this.updateQueryHandlerOptions(this.$props);
			this.updateQueryHandler(this.$data.currentValue, this.$props);
		},
		defaultSelected(newVal) {
			this.setValue(newVal);
		},
		defaultValue(newVal) {
			this.setValue(newVal);
		},
		value(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.setValue(newVal);
			}
		},
		selectedValue(newVal) {
			if (this.$data.currentValue !== newVal) {
				this.setValue(newVal || '');
			}
		},
	},
	render() {
		const { selectAllLabel, renderItem, renderError } = this.$props;
		const renderItemCalc = this.$scopedSlots.renderItem || renderItem;
		const renderErrorCalc = this.$scopedSlots.renderError || renderError;

		if (renderErrorCalc && this.error) {
			return isFunction(renderErrorCalc) ? renderErrorCalc(this.error) : renderErrorCalc;
		}
		if (this.modifiedOptions.length === 0) {
			return null;
		}

		let itemsToRender = this.$data.modifiedOptions;

		if (this.$props.transformData) {
			itemsToRender = this.$props.transformData(itemsToRender);
		}

		return (
			<Container class={this.$props.className}>
				{this.$props.title && (
					<Title class={getClassName(this.$props.innerClass, 'title') || ''}>
						{this.$props.title}
					</Title>
				)}
				{this.renderSearch()}
				<UL class={getClassName(this.$props.innerClass, 'list') || ''}>
					{selectAllLabel ? (
						<li
							key={selectAllLabel}
							class={`${this.$data.currentValue === selectAllLabel ? 'active' : ''}`}
						>
							<Radio
								class={getClassName(this.$props.innerClass, 'radio')}
								id={`${this.$props.componentId}-${selectAllLabel}`}
								name={this.$props.componentId}
								value={selectAllLabel}
								onClick={this.handleClick}
								readOnly
								show={this.$props.showRadio}
								{...{
									domProps: {
										checked: this.$data.currentValue === selectAllLabel,
									},
								}}
							/>
							<label
								class={getClassName(this.$props.innerClass, 'label') || null}
								for={`${this.$props.componentId}-${selectAllLabel}`}
							>
								{selectAllLabel}
							</label>
						</li>
					) : null}
					{itemsToRender
						.filter(item => {
							if (String(item.key).length) {
								if (this.$props.showSearch && this.$data.searchTerm) {
									return String(item.key)
										.toLowerCase()
										.includes(this.$data.searchTerm.toLowerCase());
								}

								return true;
							}

							return false;
						})
						.map(item => (
							<li
								key={item.key}
								class={`${
									this.currentValue === String(item.key) ? 'active' : ''
								}`}
							>
								<Radio
									class={getClassName(this.$props.innerClass, 'radio')}
									id={`${this.$props.componentId}-${item.key}`}
									name={this.$props.componentId}
									value={item.key}
									readOnly
									onClick={this.handleClick}
									type="radio"
									show={this.$props.showRadio}
									{...{
										domProps: {
											checked: this.currentValue === String(item.key),
										},
									}}
								/>
								<label
									class={getClassName(this.$props.innerClass, 'label') || null}
									for={`${this.$props.componentId}-${item.key}`}
								>
									{renderItemCalc ? (
										renderItemCalc({
											label: item.key,
											count: item.doc_count,
											isChecked: this.currentValue === String(item.key),
										})
									) : (
										<span>
											{item.key}
											{this.$props.showCount && (
												<span
													class={
														getClassName(
															this.$props.innerClass,
															'count',
														) || null
													}
												>
													&nbsp;(
													{item.doc_count})
												</span>
											)}
										</span>
									)}
								</label>
							</li>
						))}
				</UL>
			</Container>
		);
	},

	methods: {
		setReact(props) {
			const { react } = props;

			if (react) {
				const newReact = pushToAndClause(react, this.internalComponent);
				this.watchComponent(props.componentId, newReact);
			} else {
				this.watchComponent(props.componentId, {
					and: this.internalComponent,
				});
			}
		},

		setValue(nextValue, props = this.$props) {
			// ignore state updates when component is locked
			if (props.beforeValueChange && this.locked) {
				return;
			}

			this.locked = true;
			let value = nextValue;

			if (nextValue === this.$data.currentValue) {
				value = '';
			}

			const performUpdate = () => {
				this.currentValue = value;
				this.updateQueryHandler(value, props);
				this.locked = false;
				this.$emit('valueChange', value);
			};

			checkValueChange(props.componentId, value, props.beforeValueChange, performUpdate);
		},

		updateQueryHandler(value, props) {
			const { customQuery } = props;
			let query = SingleList.defaultQuery(value, props);
			let customQueryOptions;
			if (customQuery) {
				({ query } = customQuery(value, props) || {});
				customQueryOptions = getOptionsFromQuery(customQuery(value, props));
			}
			this.setQueryOptions(props.componentId, customQueryOptions);
			this.updateQuery({
				componentId: props.componentId,
				query,
				value,
				label: props.filterLabel,
				showFilter: props.showFilter,
				URLParams: props.URLParams,
				componentType: 'SINGLELIST',
			});
		},

		generateQueryOptions(props) {
			const queryOptions = getQueryOptions(props);
			return getAggsQuery(queryOptions, props);
		},

		updateQueryHandlerOptions(props) {
			const queryOptions = SingleList.generateQueryOptions(props);
			if (props.defaultQuery) {
				const value = this.$data.currentValue;
				const defaultQueryOptions = getOptionsFromQuery(props.defaultQuery(value, props));
				this.setQueryOptions(this.internalComponent, {
					...queryOptions,
					...defaultQueryOptions,
				});
			} else {
				this.setQueryOptions(this.internalComponent, queryOptions);
			}
		},

		handleInputChange(e) {
			const { value } = e.target;
			this.searchTerm = value;
		},

		renderSearch() {
			if (this.$props.showSearch) {
				return (
					<Input
						class={getClassName(this.$props.innerClass, 'input') || ''}
						onInput={this.handleInputChange}
						value={this.$data.searchTerm}
						placeholder={this.$props.placeholder}
						style={{
							margin: '0 0 8px',
						}}
						themePreset={this.$props.themePreset}
					/>
				);
			}

			return null;
		},

		handleClick(e) {
			const { value } = this.$props;
			if ( value === undefined ) {
				this.setValue(e.target.value);
			} else {
				this.$emit('change', e.target.value);
			}
		},
	},
};

SingleList.generateQueryOptions = props => {
	const queryOptions = getQueryOptions(props);
	return getAggsQuery(queryOptions, props);
};
SingleList.defaultQuery = (value, props) => {
	let query = null;
	if (props.selectAllLabel && props.selectAllLabel === value) {
		if (props.showMissing) {
			query = { match_all: {} };
		}
		query = {
			exists: {
				field: props.dataField,
			},
		};
	}
	if (value) {
		if (props.showMissing && props.missingLabel === value) {
			query = {
				bool: {
					must_not: {
						exists: { field: props.dataField },
					},
				},
			};
		}
		query = {
			term: {
				[props.dataField]: value,
			},
		};
	}

	if (query && props.nestedField) {
		return {
			query: {
				nested: {
					path: props.nestedField,
					query,
				},
			},
		};
	}

	return query;
};
const mapStateToProps = (state, props) => ({
	options:
		props.nestedField && state.aggregations[props.componentId]
			? state.aggregations[props.componentId].reactivesearch_nested
			: state.aggregations[props.componentId],
	selectedValue:
		(state.selectedValues[props.componentId]
			&& state.selectedValues[props.componentId].value)
		|| '',
	themePreset: state.config.themePreset,
	error: state.error[props.componentId],
});

const mapDispatchtoProps = {
	addComponent,
	removeComponent,
	setQueryOptions,
	setQueryListener,
	updateQuery,
	watchComponent,
};

const ListConnected = connect(
	mapStateToProps,
	mapDispatchtoProps,
)(SingleList);

SingleList.install = function(Vue) {
	Vue.component(SingleList.name, ListConnected);
};
export default SingleList;
