import { Actions, helper } from '@appbaseio/reactivecore';
import VueTypes from 'vue-types';
import Title from '../../styles/Title';
import Input from '../../styles/Input';
import Container from '../../styles/Container';
import { connect, isFunction, parseValueArray } from '../../utils/index';
import types from '../../utils/vueTypes';
import { UL, Checkbox } from '../../styles/FormControlList';
import { getAggsQuery } from './utils';
import { deprecatePropWarning } from '../shared/utils';

const {
	addComponent,
	removeComponent,
	watchComponent,
	updateQuery,
	setQueryOptions,
	setQueryListener,
} = Actions;
const {
	isEqual,
	getQueryOptions,
	pushToAndClause,
	checkValueChange,
	getClassName,
	getOptionsFromQuery,
} = helper;

const MultiList = {
	name: 'MultiList',
	props: {
		defaultSelected: types.stringArray,
		defaultValue: types.stringArray,
		value: types.stringArray,
		queryFormat: VueTypes.oneOf(['and', 'or']).def('or'),
		showCheckbox: VueTypes.bool.def(true),
		beforeValueChange: types.func,
		className: types.string.def(''),
		componentId: types.stringRequired,
		customQuery: types.func,
		dataField: types.stringRequired,
		defaultQuery: types.func,
		filterLabel: types.string,
		innerClass: types.style,
		placeholder: VueTypes.string.def('Search'),
		react: types.react,
		renderItem: types.func,
		renderError: types.title,
		transformData: types.func,
		selectAllLabel: types.string,
		showCount: VueTypes.bool.def(true),
		showFilter: VueTypes.bool.def(true),
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
			currentValue: {},
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
			this.setValue(this.$props.value, true);
		} else if (this.$props.defaultValue) {
			this.setValue(this.$props.defaultValue, true);
		} else if (this.$props.defaultSelected) {
			/* TODO: Remove this before next release */
			deprecatePropWarning('defaultSelected', 'defaultValue');
			this.setValue(this.$props.defaultSelected, true);
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
		defaultSelected(newVal, oldVal) {
			if (!isEqual(oldVal, newVal)) {
				this.setValue(newVal, true);
			}
		},
		value(newVal, oldVal) {
			if (!isEqual(oldVal, newVal)) {
				this.setValue(newVal, true);
			}
		},
		defaultValue(newVal, oldVal) {
			if (!isEqual(oldVal, newVal)) {
				this.setValue(newVal, true);
			}
		},
		selectedValue(newVal) {
			let selectedValue = Object.keys(this.$data.currentValue);

			if (this.$props.selectAllLabel) {
				selectedValue = selectedValue.filter(val => val !== this.$props.selectAllLabel);

				if (this.$data.currentValue[this.$props.selectAllLabel]) {
					selectedValue = [this.$props.selectAllLabel];
				}
			}
			if (!isEqual(selectedValue, newVal)) {
				this.setValue(newVal || [], true);
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
					<Title class={getClassName(this.$props.innerClass, 'title')}>
						{this.$props.title}
					</Title>
				)}
				{this.renderSearch()}
				<UL class={getClassName(this.$props.innerClass, 'list')}>
					{selectAllLabel ? (
						<li
							key={selectAllLabel}
							class={`${this.currentValue[selectAllLabel] ? 'active' : ''}`}
						>
							<Checkbox
								type="checkbox"
								class={getClassName(this.$props.innerClass, 'checkbox')}
								id={`${this.$props.componentId}-${selectAllLabel}`}
								name={selectAllLabel}
								value={selectAllLabel}
								onClick={this.handleClick}
								{...{
									domProps: {
										checked: !!this.currentValue[selectAllLabel],
									},
								}}
								show={this.$props.showCheckbox}
							/>
							<label
								class={getClassName(this.$props.innerClass, 'label')}
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
								class={`${this.$data.currentValue[item.key] ? 'active' : ''}`}
							>
								<Checkbox
									type="checkbox"
									class={getClassName(this.$props.innerClass, 'checkbox')}
									id={`${this.$props.componentId}-${item.key}`}
									name={this.$props.componentId}
									value={item.key}
									onClick={this.handleClick}
									show={this.$props.showCheckbox}
									{...{
										domProps: {
											checked: !!this.$data.currentValue[item.key],
										},
									}}
								/>
								<label
									class={getClassName(this.$props.innerClass, 'label')}
									for={`${this.$props.componentId}-${item.key}`}
								>
									{renderItemCalc ? (
										renderItemCalc({
											label: item.key,
											count: item.doc_count,
											isChecked: !!this.$data.currentValue[item.key],
										})
									) : (
										<span>
											{item.key}
											{this.$props.showCount && (
												<span
													class={getClassName(
														this.$props.innerClass,
														'count',
													)}
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
		setValue(value, isDefaultValue = false, props = this.$props) {
			// ignore state updates when component is locked
			if (props.beforeValueChange && this.locked) {
				return;
			}

			this.locked = true;
			const { selectAllLabel } = this.$props;
			let { currentValue } = this.$data;
			let finalValues = null;
			if (
				selectAllLabel
				&& ((Array.isArray(value) && value.includes(selectAllLabel))
					|| (typeof value === 'string' && value === selectAllLabel))
			) {
				if (currentValue[selectAllLabel]) {
					currentValue = {};
					finalValues = [];
				} else {
					this.$data.modifiedOptions.forEach(item => {
						currentValue[item.key] = true;
					});
					currentValue[selectAllLabel] = true;
					finalValues = [selectAllLabel];
				}
			} else if (isDefaultValue) {
				finalValues = value;
				currentValue = {};

				if (value && value.length) {
					value.forEach(item => {
						currentValue[item] = true;
					});
				}

				if (selectAllLabel && selectAllLabel in currentValue) {
					const { [selectAllLabel]: del, ...obj } = currentValue;
					currentValue = {
						...obj,
					};
				}
			} else {
				if (currentValue[value]) {
					const { [value]: del, ...rest } = currentValue;
					currentValue = {
						...rest,
					};
				} else {
					currentValue[value] = true;
				}
				if (selectAllLabel && selectAllLabel in currentValue) {
					const { [selectAllLabel]: del, ...obj } = currentValue;
					currentValue = {
						...obj,
					};
				}

				finalValues = Object.keys(currentValue);
			}

			const performUpdate = () => {
				this.currentValue = Object.assign({}, currentValue);
				this.updateQueryHandler(finalValues, props);
				this.locked = false;
				this.$emit('valueChange', finalValues);
			};
			checkValueChange(
				props.componentId,
				finalValues,
				props.beforeValueChange,
				performUpdate,
			);
		},

		updateQueryHandler(value, props) {
			const { customQuery } = props;
			let query = MultiList.defaultQuery(value, props);
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
				componentType: 'MULTILIST',
			});
		},

		generateQueryOptions(props) {
			const queryOptions = getQueryOptions(props);
			return getAggsQuery(queryOptions, props);
		},

		updateQueryHandlerOptions(props) {
			const queryOptions = MultiList.generateQueryOptions(props);
			if (props.defaultQuery) {
				const value = Object.keys(this.$data.currentValue);
				const defaultQueryOptions = getOptionsFromQuery(props.defaultQuery(value, props));
				this.setQueryOptions(this.internalComponent,
					{ ...queryOptions, ...defaultQueryOptions });
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
			const { value } = this.$props
			if (value === undefined) {
				this.setValue(e.target.value);
			} else {
				const values = parseValueArray(this.currentValue, e.target.value);
				this.$emit('change', values);
			}
		},
	},
};
MultiList.defaultQuery = (value, props) => {
	let query = null;
	const type = props.queryFormat === 'or' ? 'terms' : 'term';

	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}

	if (props.selectAllLabel && value.includes(props.selectAllLabel)) {
		if (props.showMissing) {
			query = { match_all: {} };
		} else {
			query = {
				exists: {
					field: props.dataField,
				},
			};
		}
	} else if (value) {
		let listQuery;
		if (props.queryFormat === 'or') {
			if (props.showMissing) {
				const hasMissingTerm = value.includes(props.missingLabel);
				let should = [
					{
						[type]: {
							[props.dataField]: value.filter(item => item !== props.missingLabel),
						},
					},
				];
				if (hasMissingTerm) {
					should = should.concat({
						bool: {
							must_not: {
								exists: { field: props.dataField },
							},
						},
					});
				}
				listQuery = {
					bool: {
						should,
					},
				};
			} else {
				listQuery = {
					[type]: {
						[props.dataField]: value,
					},
				};
			}
		} else {
			// adds a sub-query with must as an array of objects for each term/value
			const queryArray = value.map(item => ({
				[type]: {
					[props.dataField]: item,
				},
			}));
			listQuery = {
				bool: {
					must: queryArray,
				},
			};
		}

		query = value.length ? listQuery : null;
	}

	if (query && props.nestedField) {
		query = {
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
MultiList.generateQueryOptions = props => {
	const queryOptions = getQueryOptions(props);
	return getAggsQuery(queryOptions, props);
};
const mapStateToProps = (state, props) => ({
	options:
		props.nestedField && state.aggregations[props.componentId]
			? state.aggregations[props.componentId].reactivesearch_nested
			: state.aggregations[props.componentId],
	selectedValue:
		(state.selectedValues[props.componentId]
			&& state.selectedValues[props.componentId].value)
		|| null,
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
)(MultiList);

MultiList.install = function(Vue) {
	Vue.component(MultiList.name, ListConnected);
};
export default MultiList;
